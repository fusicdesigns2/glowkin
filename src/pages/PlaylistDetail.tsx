import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSpotifyPlaylists } from '@/hooks/useSpotifyPlaylists'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Loader2, Clock, Music, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

const PlaylistDetail = () => {
  const { playlistId } = useParams<{ playlistId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { updatePlaylist } = useSpotifyPlaylists()
  
  const [playlist, setPlaylist] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [removedSongs, setRemovedSongs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (playlistId && user) {
      loadPlaylistData()
    }
  }, [playlistId, user])

  const loadPlaylistData = async () => {
    setIsLoading(true)
    try {
      // Get playlist info from our database using the internal ID
      const { data: playlistData } = await supabase
        .from('spotify_playlists')
        .select('*')
        .eq('id', playlistId)
        .eq('user_id', user?.id)
        .single()

      if (!playlistData) {
        toast.error('Playlist not found')
        navigate('/spotify-playlists')
        return
      }

      setPlaylist(playlistData)

      // Load active songs for this playlist
      const { data: activeSongs } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistData.spotify_playlist_id)
        .is('removed_at', null)
        .order('added_to_app_at', { ascending: false })

      if (activeSongs) {
        setSongs(activeSongs)
      }

      // Load removed songs for this playlist
      const { data: removedSongsData } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistData.spotify_playlist_id)
        .not('removed_at', 'is', null)
        .order('removed_at', { ascending: false })

      if (removedSongsData) {
        setRemovedSongs(removedSongsData)
      }
    } catch (error) {
      console.error('Error loading playlist data:', error)
      toast.error('Failed to load playlist data')
    } finally {
      setIsLoading(false)
    }
  }

  const removeSongFromPlaylist = async (trackId: string) => {
    try {
      await supabase
        .from('playlist_songs')
        .update({ removed_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlist.spotify_playlist_id)
        .eq('spotify_track_id', trackId)

      await loadPlaylistData()
      toast.success('Song removed from playlist')
    } catch (error) {
      console.error('Error removing song:', error)
      toast.error('Failed to remove song')
    }
  }

  const restoreSong = async (trackId: string) => {
    try {
      await supabase
        .from('playlist_songs')
        .update({ 
          removed_at: null,
          added_to_app_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlist.spotify_playlist_id)
        .eq('spotify_track_id', trackId)

      await loadPlaylistData()
      toast.success('Song restored to playlist')
    } catch (error) {
      console.error('Error restoring song:', error)
      toast.error('Failed to restore song')
    }
  }

  const handleUpdatePlaylist = async () => {
    if (!playlist) return
    
    setIsUpdating(true)
    try {
      // Limit to 100 songs and get track IDs
      const trackIds = songs.slice(0, 100).map(song => song.spotify_track_id)
      
      if (trackIds.length > 0) {
        await updatePlaylist(playlist.spotify_playlist_id, trackIds)
        
        // Remove excess songs from database if we had more than 100
        if (songs.length > 100) {
          const excessSongs = songs.slice(100)
          for (const song of excessSongs) {
            await supabase
              .from('playlist_songs')
              .update({ removed_at: new Date().toISOString() })
              .eq('user_id', user?.id)
              .eq('spotify_playlist_id', playlist.spotify_playlist_id)
              .eq('spotify_track_id', song.spotify_track_id)
          }
          
          await loadPlaylistData()
        }
        
        toast.success('Playlist updated successfully!')
      } else {
        toast.error('No songs to update')
      }
    } catch (error) {
      console.error('Error updating playlist:', error)
      toast.error('Failed to update playlist')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveAndSend = async () => {
    if (!playlist) return
    
    setIsRemoving(true)
    try {
      // Delete removed songs from database
      if (removedSongs.length > 0) {
        const removedTrackIds = removedSongs.map(song => song.spotify_track_id)
        
        await supabase
          .from('playlist_songs')
          .delete()
          .eq('user_id', user?.id)
          .eq('spotify_playlist_id', playlist.spotify_playlist_id)
          .in('spotify_track_id', removedTrackIds)
      }

      // Update playlist with current songs
      const trackIds = songs.slice(0, 100).map(song => song.spotify_track_id)
      
      if (trackIds.length > 0) {
        await updatePlaylist(playlist.spotify_playlist_id, trackIds)
        
        // Handle excess songs
        if (songs.length > 100) {
          const excessSongs = songs.slice(100)
          for (const song of excessSongs) {
            await supabase
              .from('playlist_songs')
              .update({ removed_at: new Date().toISOString() })
              .eq('user_id', user?.id)
              .eq('spotify_playlist_id', playlist.spotify_playlist_id)
              .eq('spotify_track_id', song.spotify_track_id)
          }
        }
      }
      
      await loadPlaylistData()
      toast.success('Removed songs deleted and playlist updated!')
    } catch (error) {
      console.error('Error removing and sending:', error)
      toast.error('Failed to remove and send')
    } finally {
      setIsRemoving(false)
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading playlist...</span>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Playlist Not Found</CardTitle>
            <CardDescription>The requested playlist could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/spotify-playlists')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Playlist Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/spotify-playlists')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-6 w-6" />
                  {playlist.playlist_name}
                </CardTitle>
                <CardDescription>
                  {songs.length} active songs • {removedSongs.length} removed songs
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {songs.length}/100 songs
              </Badge>
              {removedSongs.length > 0 && (
                <Button 
                  onClick={handleRemoveAndSend}
                  disabled={isRemoving || songs.length === 0}
                  variant="destructive"
                  size="sm"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove & Send ({removedSongs.length})
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={handleUpdatePlaylist}
                disabled={isUpdating || songs.length === 0}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Update Playlist
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Active Songs List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Songs</CardTitle>
          {songs.length > 100 && (
            <CardDescription className="text-orange-600">
              ⚠️ This playlist has {songs.length} songs. Only the first 100 will be synced to Spotify.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {songs.length > 0 ? (
            <div className="space-y-2">
              {songs.map((song, index) => (
                <div 
                  key={song.id} 
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    index >= 100 ? 'bg-orange-50 border-orange-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm text-gray-500 w-8">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{song.track_name}</div>
                      <div className="text-sm text-gray-600">
                        {song.artist_name} • {song.album_name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(song.duration_ms)}
                        </span>
                        <span>Added: {new Date(song.added_to_app_at).toLocaleDateString()}</span>
                        {song.search_year && <span>Year: {song.search_year}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSongFromPlaylist(song.spotify_track_id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Music className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <div className="text-lg font-medium mb-2">No active songs in this playlist</div>
              <div className="text-sm">Add songs from the search results to get started</div>
              <Button 
                className="mt-4"
                onClick={() => navigate('/spotify-playlists')}
              >
                Search for Songs
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Removed Songs List */}
      {removedSongs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Removed Songs ({removedSongs.length})</CardTitle>
            <CardDescription>
              These songs have been removed but not yet deleted. Use "Remove & Send" to permanently delete them and update Spotify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {removedSongs.map((song) => (
                <div 
                  key={song.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-red-50 border-red-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <div className="font-medium">{song.track_name}</div>
                      <div className="text-sm text-gray-600">
                        {song.artist_name} • {song.album_name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(song.duration_ms)}
                        </span>
                        <span>Removed: {new Date(song.removed_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restoreSong(song.spotify_track_id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PlaylistDetail
