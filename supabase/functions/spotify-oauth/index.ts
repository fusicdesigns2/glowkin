
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { action, code, refresh_token } = await req.json()

    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured')
    }

    if (action === 'get_auth_url') {
      const scopes = [
        'playlist-read-private',
        'playlist-modify-private',
        'playlist-modify-public',
        'user-read-private'
      ].join(' ')
      
      const redirectUri = `${req.headers.get('origin')}/spotify-callback`
      const state = crypto.randomUUID()
      
      const authUrl = `https://accounts.spotify.com/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`

      return new Response(JSON.stringify({
        success: true,
        authUrl,
        state
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'exchange_code') {
      const redirectUri = `${req.headers.get('origin')}/spotify-callback`
      
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      })

      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || 'Failed to exchange code')
      }

      // Get user info
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })
      
      const userData = await userResponse.json()

      // Store tokens in database
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

      await supabaseClient
        .from('spotify_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt
        })

      return new Response(JSON.stringify({
        success: true,
        user: userData,
        expires_in: tokenData.expires_in
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'refresh_token') {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token
        })
      })

      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || 'Failed to refresh token')
      }

      // Update tokens in database
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

      await supabaseClient
        .from('spotify_tokens')
        .update({
          access_token: tokenData.access_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      return new Response(JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Spotify OAuth error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
