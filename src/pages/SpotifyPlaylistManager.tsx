import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useSpotifyPlaylists } from '@/hooks/useSpotifyPlaylists'
import { useSpotifySearch } from '@/hooks/useSpotifySearch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Loader2, Music, Search, Plus, Play, Clock, ChevronDown, Sparkles, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

const SpotifyPlaylistManager = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { spotifyUser, hasValidToken, isLoading: authLoading, initiateSpotifyAuth } = useSpotifyAuth()
  const { playlists, selectedPlaylists, isLoading: playlistsLoading, fetchPlaylists, togglePlaylistSelection, updatePlaylist } = useSpotifyPlaylists()
  const { searchResults, searchedYears, currentYear, isSearching, searchSongs, searchYear, clearResults } = useSpotifySearch()
  
  const [songQueries, setSongQueries] = useState('')
  const [playlistSongs, setPlaylistSongs] = useState<{ [playlistId: string]: any[] }>({})
  const [isUpdatingPlaylists, setIsUpdatingPlaylists] = useState(false)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [draggedTrack, setDraggedTrack] = useState<any>(null)

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

  useEffect(() => {
    if (hasValidToken && playlists.length > 0) {
      updatePlaylistsInDatabase()
    }
  }, [playlists, user])

  const updatePlaylistsInDatabase = async () => {
    if (!user || playlists.length === 0) return

    try {
      // Get existing playlists from database
      const { data: existingPlaylists } = await supabase
        .from('spotify_playlists')
        .select('spotify_playlist_id')
        .eq('user_id', user.id)

      const existingPlaylistIds = new Set(existingPlaylists?.map(p => p.spotify_playlist_id) || [])

      // Only insert playlists that don't already exist
      const playlistsToStore = playlists
        .filter((playlist: any) => !existingPlaylistIds.has(playlist.id))
        .map((playlist: any) => ({
          user_id: user.id,
          spotify_playlist_id: playlist.id,
          playlist_name: playlist.name,
          is_selected: selectedPlaylists.includes(playlist.id)
        }))

      if (playlistsToStore.length > 0) {
        await supabase
          .from('spotify_playlists')
          .insert(playlistsToStore)
        
        console.log(`Added ${playlistsToStore.length} new playlists to database`)
      }

      // Now fetch and store songs for each playlist
      await fetchAndStoreSongsForPlaylists()
    } catch (error) {
      console.error('Error updating playlists in database:', error)
    }
  }

  const fetchAndStoreSongsForPlaylists = async () => {
    if (!user) return

    try {
      for (const playlist of playlists) {
        // Get playlist tracks from Spotify
        const response = await supabase.functions.invoke('spotify-api', {
          body: { 
            action: 'get_playlist_tracks', 
            playlistId: playlist.id 
          }
        })

        if (response.data?.success && response.data.tracks) {
          const tracks = response.data.tracks

          // Check which songs are already in playlist_songs table
          const { data: existingSongs } = await supabase
            .from('playlist_songs')
            .select('spotify_track_id')
            .eq('user_id', user.id)
            .eq('spotify_playlist_id', playlist.id)

          const existingTrackIds = new Set(existingSongs?.map(s => s.spotify_track_id) || [])

          // Insert new songs
          const songsToInsert = tracks
            .filter((track: any) => !existingTrackIds.has(track.id))
            .map((track: any) => ({
              user_id: user.id,
              spotify_playlist_id: playlist.id,
              spotify_track_id: track.id,
              track_name: track.name,
              artist_name: track.artists.map((a: any) => a.name).join(', '),
              album_name: track.album.name,
              duration_ms: track.duration_ms
            }))

          if (songsToInsert.length > 0) {
            await supabase
              .from('playlist_songs')
              .insert(songsToInsert)
          }

          // Check which songs are in songs_in_playlist table
          const { data: existingPlaylistSongs } = await supabase
            .from('songs_in_playlist')
            .select('track_id')
            .eq('user_id', user.id)
            .eq('playlist_id', playlist.id)

          const existingPlaylistTrackIds = new Set(existingPlaylistSongs?.map(s => s.track_id) || [])

          // Insert into songs_in_playlist for new tracks
          const playlistSongsToInsert = tracks
            .filter((track: any) => !existingPlaylistTrackIds.has(track.id))
            .map((track: any) => ({
              user_id: user.id,
              playlist_id: playlist.id,
              track_id: track.id
            }))

          if (playlistSongsToInsert.length > 0) {
            await supabase
              .from('songs_in_playlist')
              .insert(playlistSongsToInsert)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching and storing songs for playlists:', error)
    }
  }

  const loadPlaylistSongs = async () => {
    try {
      const { data } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .in('spotify_playlist_id', selectedPlaylists)
        .is('removed_at', null)
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

  const cleanUpQueries = async () => {
    if (!songQueries.trim()) {
      toast.error('Please enter song queries first')
      return
    }

    setIsCleaningUp(true)
    try {
      const response = await supabase.functions.invoke('clean-song-queries', {
        body: { queries: songQueries }
      })

      if (response.data?.success) {
        setSongQueries(response.data.cleanedQueries)
        clearResults() // Reset years when cleaning up
        toast.success('Song queries cleaned up!')
      } else {
        throw new Error(response.data?.error || 'Failed to clean up queries')
      }
    } catch (error) {
      console.error('Error cleaning up queries:', error)
      toast.error('Failed to clean up queries')
    } finally {
      setIsCleaningUp(false)
    }
  }

  const handleSearch = async () => {
    const queries = songQueries.split('\n').filter(q => q.trim()).slice(0, 25)
    if (queries.length === 0) {
      toast.error('Please enter at least one song query')
      return
    }

    await searchSongs(queries)
  }

  const handleYearClick = async (year: number) => {
    const queries = songQueries.split('\n').filter(q => q.trim()).slice(0, 25)
    if (queries.length === 0) {
      toast.error('Please enter song queries first')
      return
    }

    await searchYear(year, queries)
  }

  const addSongToPlaylist = async (track: any, playlistId: string) => {
    try {
      // Check if song exists (including removed ones) and restore if needed
      const { data: existingSong } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistId)
        .eq('spotify_track_id', track.id)
        .single()

      if (existingSong) {
        // If song exists but was removed, restore it
        if (existingSong.removed_at) {
          await supabase
            .from('playlist_songs')
            .update({ 
              removed_at: null,
              added_to_app_at: new Date().toISOString(),
              search_year: currentYear 
            })
            .eq('id', existingSong.id)
        }
      } else {
        // Create new song entry
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
          .insert(songData)
      }

      // Also add to songs_in_playlist if not already there
      const { data: existingPlaylistSong } = await supabase
        .from('songs_in_playlist')
        .select('*')
        .eq('user_id', user?.id)
        .eq('playlist_id', playlistId)
        .eq('track_id', track.id)
        .single()

      if (!existingPlaylistSong) {
        await supabase
          .from('songs_in_playlist')
          .insert({
            user_id: user?.id,
            playlist_id: playlistId,
            track_id: track.id
          })
      }

      await loadPlaylistSongs()
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
        .update({ removed_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistId)
        .eq('spotify_track_id', trackId)

      await loadPlaylistSongs()
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
                .update({ removed_at: new Date().toISOString() })
                .eq('user_id', user?.id)
                .eq('spotify_playlist_id', playlistId)
                .eq('spotify_track_id', song.spotify_track_id)
            }
          }
        }
      }
      
      toast.success('All playlists updated successfully!')
      await loadPlaylistSongs()
    } catch (error) {
      console.error('Error updating playlists:', error)
      toast.error('Failed to update some playlists')
    } finally {
      setIsUpdatingPlaylists(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, track: any) => {
    console.log('Drag started with track:', track.name)
    setDraggedTrack(track)
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', track.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent, playlistId: string) => {
    e.preventDefault()
    console.log('Drop event on playlist:', playlistId, 'with track:', draggedTrack?.name)
    if (draggedTrack) {
      addSongToPlaylist(draggedTrack, playlistId)
      setDraggedTrack(null)
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Sort playlists by last updated (most recent first)
  const sortedSelectedPlaylists = selectedPlaylists
    .map(id => playlists.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => {
      const aSongs = playlistSongs[a!.id] || []
      const bSongs = playlistSongs[b!.id] || []
      const aLastUpdated = aSongs.length > 0 ? new Date(aSongs[0].added_to_app_at).getTime() : 0
      const bLastUpdated = bSongs.length > 0 ? new Date(bSongs[0].added_to_app_at).getTime() : 0
      return bLastUpdated - aLastUpdated
    })

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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Search, Results, and Playlist Selection */}
        <div className="lg:col-span-2 space-y-6">
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
                Enter up to 25 song queries (one per line). Search starts from {currentYear}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter song queries here, one per line&#10;Example:&#10;Shape of You Ed Sheeran&#10;Blinding Lights The Weeknd&#10;Watermelon Sugar Harry Styles"
                value={songQueries}
                onChange={(e) => setSongQueries(e.target.value)}
                rows={6}
              />
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={cleanUpQueries} 
                  disabled={isCleaningUp}
                  variant="outline"
                >
                  {isCleaningUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Clean up
                    </>
                  )}
                </Button>
                
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
              </div>

              {/* Year Selection */}
              {searchedYears.length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-sm font-medium">Years:</span>
                  {searchedYears.map(year => (
                    <Button
                      key={year}
                      variant={year === currentYear ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleYearClick(year)}
                      disabled={isSearching}
                    >
                      {year}
                    </Button>
                  ))}
                  {/* Add buttons for additional years */}
                  {!searchedYears.includes(currentYear - 1) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleYearClick(currentYear - 1)}
                      disabled={isSearching}
                    >
                      {currentYear - 1}
                    </Button>
                  )}
                  {!searchedYears.includes(currentYear - 2) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleYearClick(currentYear - 2)}
                      disabled={isSearching}
                    >
                      {currentYear - 2}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Drag songs to playlists on the right or use the dropdown menu to add them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={`${result.query}-${result.year}-${index}`} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">
                        Query: "{result.query}"
                        <Badge variant="secondary" className="ml-2">{result.year}</Badge>
                      </h4>
                      {result.tracks.length > 0 ? (
                        <div className="grid gap-2">
                          {result.tracks.map((track) => (
                            <div 
                              key={track.id} 
                              className="flex items-center justify-between p-2 border rounded cursor-move hover:bg-gray-50 transition-colors"
                              draggable
                              onDragStart={(e) => handleDragStart(e, track)}
                            >
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Add to Playlist <ChevronDown className="ml-1 h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {selectedPlaylists
                                    .map(id => playlists.find(p => p.id === id))
                                    .filter(Boolean)
                                    .sort((a, b) => a!.name.localeCompare(b!.name))
                                    .map(playlist => {
                                      const isAdded = playlistSongs[playlist!.id]?.some(s => s.spotify_track_id === track.id)
                                      return (
                                        <DropdownMenuItem
                                          key={playlist!.id}
                                          onClick={() => isAdded 
                                            ? removeSongFromPlaylist(track.id, playlist!.id)
                                            : addSongToPlaylist(track, playlist!.id)
                                          }
                                        >
                                          {isAdded ? '✓ ' : ''}{playlist!.name}
                                        </DropdownMenuItem>
                                      )
                                    })}
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                Choose playlists to manage (selected playlists appear on the right)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {playlistsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading playlists...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => togglePlaylistSelection(playlist.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaylists.includes(playlist.id)}
                        onChange={() => {}}
                        className="rounded"
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
        </div>

        {/* Right Column - Selected Playlists (Sticky) */}
        <div className="space-y-6 lg:sticky lg:top-4 lg:h-screen lg:overflow-y-auto">
          {selectedPlaylists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Selected Playlists ({selectedPlaylists.length})</span>
                  <Button 
                    onClick={handleUpdateAllPlaylists}
                    disabled={isUpdatingPlaylists}
                    size="sm"
                  >
                    {isUpdatingPlaylists ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Update All
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sortedSelectedPlaylists.map(playlist => {
                    if (!playlist) return null
                    const songs = playlistSongs[playlist.id] || []
                    
                    return (
                      <div 
                        key={playlist.id} 
                        className="border-2 border-dashed border-gray-200 rounded-lg p-3 transition-colors hover:border-blue-300"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, playlist.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold truncate">{playlist.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {songs.length}/100
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`https://open.spotify.com/playlist/${playlist.id}`, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-2">
                          {songs.length > 0 && `Last updated: ${new Date(songs[0].added_to_app_at).toLocaleDateString()}`}
                        </div>
                        
                        {songs.length > 0 ? (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {songs.slice(0, 5).map((song, index) => (
                              <div key={song.id} className="text-xs flex items-center justify-between p-1 bg-gray-50 rounded">
                                <div className="truncate">
                                  <span className="font-medium">{song.track_name}</span>
                                  <span className="text-gray-500"> • {song.artist_name}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeSongFromPlaylist(song.spotify_track_id, playlist.id)
                                  }}
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                            {songs.length > 5 && (
                              <div className="text-xs text-gray-500 text-center py-1">
                                +{songs.length - 5} more songs
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500 italic text-center py-4 text-xs border-2 border-dashed border-gray-200 rounded bg-gray-50">
                            Drop songs here or use the dropdown menu
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
      </div>
    </div>
  )
}

export default SpotifyPlaylistManager
