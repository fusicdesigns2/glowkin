import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  duration_ms: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's Spotify token
    const { data: tokenData } = await supabaseClient
      .from('spotify_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!tokenData) {
      throw new Error('No Spotify token found. Please authenticate with Spotify first.')
    }

    const { action, query, year, playlistId, trackIds, searchQueries } = await req.json()

    const makeSpotifyRequest = async (url: string, options: any = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
      
      if (response.status === 401) {
        throw new Error('Spotify token expired')
      }
      
      return response
    }

    if (action === 'get_playlists') {
      const response = await makeSpotifyRequest('https://api.spotify.com/v1/me/playlists?limit=50')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch playlists')
      }

      // Store playlists in database
      const playlistsToStore = data.items.map((playlist: any) => ({
        user_id: user.id,
        spotify_playlist_id: playlist.id,
        playlist_name: playlist.name,
        is_selected: false
      }))

      await supabaseClient
        .from('spotify_playlists')
        .upsert(playlistsToStore, { onConflict: 'user_id,spotify_playlist_id' })

      return new Response(JSON.stringify({
        success: true,
        playlists: data.items
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_playlist_tracks') {
      const response = await makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch playlist tracks')
      }

      const tracks = data.items.map((item: any) => item.track).filter((track: any) => track && track.id)

      return new Response(JSON.stringify({
        success: true,
        tracks
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'search_songs') {
      const results = []
      
      for (const searchQuery of searchQueries) {
        const queryParam = encodeURIComponent(`${searchQuery} year:${year}`)
        const response = await makeSpotifyRequest(`https://api.spotify.com/v1/search?q=${queryParam}&type=track&limit=25`)
        const data = await response.json()
        
        if (response.ok && data.tracks.items.length > 0) {
          results.push({
            query: searchQuery,
            tracks: data.tracks.items.slice(0, 5), // Limit to top 5 results per query
            year
          })
        } else {
          results.push({
            query: searchQuery,
            tracks: [],
            year
          })
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return new Response(JSON.stringify({
        success: true,
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_playlist') {
      // Clear existing tracks
      const clearResponse = await makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [] })
      })

      if (!clearResponse.ok) {
        const error = await clearResponse.json()
        throw new Error(`Failed to clear playlist: ${error.error?.message}`)
      }

      // Add new tracks in batches of 100 (Spotify limit)
      const batchSize = 100
      const failedTracks = []

      for (let i = 0; i < trackIds.length; i += batchSize) {
        const batch = trackIds.slice(i, i + batchSize)
        const uris = batch.map((id: string) => `spotify:track:${id}`)

        let retryCount = 0
        let success = false

        while (retryCount < 3 && !success) {
          try {
            const addResponse = await makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
              method: 'POST',
              body: JSON.stringify({ uris })
            })

            if (addResponse.ok) {
              success = true
            } else {
              const error = await addResponse.json()
              console.error(`Attempt ${retryCount + 1} failed:`, error)
              retryCount++
              
              if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
              }
            }
          } catch (error) {
            console.error(`Attempt ${retryCount + 1} error:`, error)
            retryCount++
            
            if (retryCount < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
            }
          }
        }

        if (!success) {
          failedTracks.push(...batch)
        }
      }

      return new Response(JSON.stringify({
        success: true,
        failedTracks,
        totalTracks: trackIds.length,
        successfulTracks: trackIds.length - failedTracks.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Spotify API error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
