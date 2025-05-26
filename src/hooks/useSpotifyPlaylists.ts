
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  tracks: { total: number }
  images: { url: string }[]
  owner: { display_name: string }
}

export const useSpotifyPlaylists = () => {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadSelectedPlaylists()
    }
  }, [user])

  const loadSelectedPlaylists = async () => {
    try {
      const { data } = await supabase
        .from('spotify_playlists')
        .select('spotify_playlist_id')
        .eq('user_id', user?.id)
        .eq('is_selected', true)

      if (data) {
        setSelectedPlaylists(data.map(p => p.spotify_playlist_id))
      }
    } catch (error) {
      console.error('Error loading selected playlists:', error)
    }
  }

  const fetchPlaylists = async () => {
    setIsLoading(true)
    try {
      const response = await supabase.functions.invoke('spotify-api', {
        body: { action: 'get_playlists' }
      })

      if (response.data?.success) {
        setPlaylists(response.data.playlists)
      } else {
        throw new Error(response.data?.error || 'Failed to fetch playlists')
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
      toast.error('Failed to load Spotify playlists')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePlaylistSelection = async (playlistId: string) => {
    const isSelected = selectedPlaylists.includes(playlistId)
    
    try {
      await supabase
        .from('spotify_playlists')
        .update({ is_selected: !isSelected })
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistId)

      if (isSelected) {
        setSelectedPlaylists(prev => prev.filter(id => id !== playlistId))
        toast.success('Playlist removed from selection')
      } else {
        setSelectedPlaylists(prev => [...prev, playlistId])
        toast.success('Playlist added to selection')
      }
    } catch (error) {
      console.error('Error toggling playlist selection:', error)
      toast.error('Failed to update playlist selection')
    }
  }

  const updatePlaylist = async (playlistId: string, trackIds: string[]) => {
    try {
      const response = await supabase.functions.invoke('spotify-api', {
        body: { 
          action: 'update_playlist', 
          playlistId, 
          trackIds 
        }
      })

      if (response.data?.success) {
        const { failedTracks, totalTracks, successfulTracks } = response.data
        
        if (failedTracks.length > 0) {
          toast.warning(`Playlist updated with ${successfulTracks}/${totalTracks} songs. ${failedTracks.length} songs failed to add.`)
        } else {
          toast.success(`Playlist updated successfully with ${totalTracks} songs`)
        }
        
        return response.data
      } else {
        throw new Error(response.data?.error || 'Failed to update playlist')
      }
    } catch (error) {
      console.error('Error updating playlist:', error)
      toast.error('Failed to update playlist')
      throw error
    }
  }

  return {
    playlists,
    selectedPlaylists,
    isLoading,
    fetchPlaylists,
    togglePlaylistSelection,
    updatePlaylist
  }
}
