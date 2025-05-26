
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useSpotifyPlaylists } from '@/hooks/useSpotifyPlaylists'
import { useSpotifySearch } from '@/hooks/useSpotifySearch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Music, Search, Plus, Play, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

const SpotifyPlaylistManager = () => {
  const { user } = useAuth()
  const { spotifyUser, hasValidToken, isLoading: authLoading, initiateSpotifyAuth } = useSpotifyAuth()
  const { playlists, selectedPlaylists, isLoading: playlistsLoading, fetchPlaylists, togglePlaylistSelection, updatePlaylist } = useSpotifyPlaylists()
  const { searchResults, currentYear, isSearching, searchSongs, searchPreviousYear, clearResults } = useSpotifySearch()
  
  const [songQueries, setSongQueries] = useState('')
  const [playlistSongs, setPlaylistSongs] = useState<{ [playlistId: string]: any[] }>({})
  const [isUpdatingPlaylists, setIsUpdatingPlaylists] = useState(false)

  useEffect(() => {
    if (hasValidToken && playlists.length === 0) {
      fetchPlaylists()
    }
  }, [hasValidToken])

  useEffect(() => {
    if (user) {
      loadPlaylistSongs()
    }
  }, [user, selectedPlaylists])

  const loadPlaylistSongs = async () => {
    try {
      const { data } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .in('spotify_playlist_id', selectedPlaylists)
        .order('added_to_app_at', { ascending: false })

      if (data) {
        const songsByPlaylist = data.reduce((acc, song) => {
          if (!acc[song.spotify_playlist_id]) {
            acc[song.spotify_playlist_id] = []
          }
          acc[song.spotify_playlist_id].push(song)
          return acc
        }, {} as { [playlistId: string]: any[] })

        setPlaylistSongs(songsByPlaylist)
      }
    } catch (error) {
      console.error('Error loading playlist songs:', error)
    }
  }

  const handleSearch = async () => {
    const queries = songQueries.split('\n').filter(q => q.trim()).slice(0, 10)
    if (queries.length === 0) {
      toast.error('Please enter at least one song query')
      return
    }

    clearResults()
    await searchSongs(queries)
  }

  const handleSearchPreviousYear = async () => {
    const queries = songQueries.split('\n').filter(q => q.trim()).slice(0, 10)
    await searchPreviousYear(queries)
  }

  const addSongToPlaylist = async (track: any, playlistId: string) => {
    try {
      const songData = {
        user_id: user?.id,
        spotify_playlist_id: playlistId,
        spotify_track_id: track.id,
        track_name: track.name,
        artist_name: track.artists.map((a: any) => a.name).join(', '),
        album_name: track.album.name,
        duration_ms: track.duration_ms,
        search_year: currentYear
      }

      await supabase
        .from('playlist_songs')
        .upsert(songData, { onConflict: 'user_id,spotify_playlist_id,spotify_track_id' })

      // Update local state
      setPlaylistSongs(prev => ({
        ...prev,
        [playlistId]: [songData, ...(prev[playlistId] || []).filter(s => s.spotify_track_id !== track.id)]
      }))

      toast.success('Song added to playlist')
    } catch (error) {
      console.error('Error adding song to playlist:', error)
      toast.error('Failed to add song to playlist')
    }
  }

  const removeSongFromPlaylist = async (trackId: string, playlistId: string) => {
    try {
      await supabase
        .from('playlist_songs')
        .delete()
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistId)
        .eq('spotify_track_id', trackId)

      setPlaylistSongs(prev => ({
        ...prev,
        [playlistId]: (prev[playlistId] || []).filter(s => s.spotify_track_id !== trackId)
      }))

      toast.success('Song removed from playlist')
    } catch (error) {
      console.error('Error removing song from playlist:', error)
      toast.error('Failed to remove song from playlist')
    }
  }

  const handleUpdateAllPlaylists = async () => {
    setIsUpdatingPlaylists(true)
    try {
      for (const playlistId of selectedPlaylists) {
        const songs = playlistSongs[playlistId] || []
        
        // Limit to 100 songs and get track IDs
        const trackIds = songs.slice(0, 100).map(song => song.spotify_track_id)
        
        if (trackIds.length > 0) {
          await updatePlaylist(playlistId, trackIds)
          
          // Remove excess songs from database if we had more than 100
          if (songs.length > 100) {
            const excessSongs = songs.slice(100)
            for (const song of excessSongs) {
              await supabase
                .from('playlist_songs')
                .delete()
                .eq('user_id', user?.id)
                .eq('spotify_playlist_id', playlistId)
                .eq('spotify_track_id', song.spotify_track_id)
            }
          }
        }
      }
      
      toast.success('All playlists updated successfully!')
      await loadPlaylistSongs() // Refresh data
    } catch (error) {
      console.error('Error updating playlists:', error)
      toast.error('Failed to update some playlists')
    } finally {
      setIsUpdatingPlaylists(false)
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to use the Spotify Playlist Manager</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!hasValidToken) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-6 w-6" />
              Connect to Spotify
            </CardTitle>
            <CardDescription>
              Connect your Spotify account to manage your playlists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={initiateSpotifyAuth} disabled={authLoading}>
              {authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Music className="mr-2 h-4 w-4" />
                  Connect Spotify
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-6 w-6" />
            Spotify Playlist Manager
          </CardTitle>
          <CardDescription>
            Connected as: <strong>{spotifyUser?.display_name || 'Unknown User'}</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Song Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6" />
            Search Songs
          </CardTitle>
          <CardDescription>
            Enter up to 10 song queries (one per line). Search starts from {currentYear}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter song queries here, one per line&#10;Example:&#10;Shape of You Ed Sheeran&#10;Blinding Lights The Weeknd&#10;Watermelon Sugar Harry Styles"
            value={songQueries}
            onChange={(e) => setSongQueries(e.target.value)}
            rows={6}
          />
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching {currentYear}...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search {currentYear}
                </>
              )}
            </Button>
            
            {searchResults.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleSearchPreviousYear}
                disabled={isSearching}
              >
                Search {currentYear - 1}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Drag songs to your selected playlists or click the + button
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">
                    Query: "{result.query}"
                    <Badge variant="secondary" className="ml-2">{result.year}</Badge>
                  </h4>
                  {result.tracks.length > 0 ? (
                    <div className="grid gap-2">
                      {result.tracks.map((track) => (
                        <div key={track.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{track.name}</div>
                            <div className="text-sm text-gray-600">
                              {track.artists.map(a => a.name).join(', ')} • {track.album.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(track.duration_ms)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {selectedPlaylists.map(playlistId => {
                              const playlist = playlists.find(p => p.id === playlistId)
                              const isAdded = playlistSongs[playlistId]?.some(s => s.spotify_track_id === track.id)
                              
                              return (
                                <Button
                                  key={playlistId}
                                  size="sm"
                                  variant={isAdded ? "default" : "outline"}
                                  onClick={() => isAdded 
                                    ? removeSongFromPlaylist(track.id, playlistId)
                                    : addSongToPlaylist(track, playlistId)
                                  }
                                  title={`${isAdded ? 'Remove from' : 'Add to'} ${playlist?.name}`}
                                >
                                  {isAdded ? '✓' : '+'}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">No matches found for {result.year}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Playlist Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Playlists to Manage</CardTitle>
          <CardDescription>
            Choose up to 20 playlists to update
          </CardDescription>
        </CardHeader>
        <CardContent>
          {playlistsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading playlists...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg"
                >
                  <Checkbox
                    checked={selectedPlaylists.includes(playlist.id)}
                    onCheckedChange={() => togglePlaylistSelection(playlist.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium truncate">{playlist.name}</div>
                    <div className="text-sm text-gray-600">
                      {playlist.tracks.total} tracks
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Playlists with Songs */}
      {selectedPlaylists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Selected Playlists ({selectedPlaylists.length})</span>
              <Button 
                onClick={handleUpdateAllPlaylists}
                disabled={isUpdatingPlaylists}
              >
                {isUpdatingPlaylists ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Update All Playlists
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedPlaylists.map(playlistId => {
                const playlist = playlists.find(p => p.id === playlistId)
                const songs = playlistSongs[playlistId] || []
                
                return (
                  <div key={playlistId} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center justify-between">
                      <span>{playlist?.name}</span>
                      <Badge variant="outline">
                        {songs.length}/100 songs
                      </Badge>
                    </h4>
                    
                    {songs.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {songs.slice(0, 100).map((song, index) => (
                          <div key={song.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="font-medium">{song.track_name}</div>
                              <div className="text-sm text-gray-600">
                                {song.artist_name} • {song.album_name}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                #{index + 1}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeSongFromPlaylist(song.spotify_track_id, playlistId)}
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        ))}
                        {songs.length > 100 && (
                          <div className="text-sm text-orange-600 font-medium">
                            ⚠️ {songs.length - 100} excess songs will be removed to maintain 100-song limit
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic text-center py-4">
                        No songs added yet. Search and add songs above.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SpotifyPlaylistManager
