import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSpotifyPlaylists } from '@/hooks/useSpotifyPlaylists'
import { useMusicPlayer } from '@/hooks/useMusicPlayer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Loader2, Clock, Music, Trash2, GripVertical, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { ExpandablePlaylistCard } from '@/components/ExpandablePlaylistCard'
import { MusicPlayer } from '@/components/MusicPlayer'

const PlaylistDetail = () => {
  const { playlistId } = useParams<{ playlistId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { updatePlaylist, playlists, selectedPlaylists, togglePlaylistSelection, fetchPlaylists } = useSpotifyPlaylists()
  const { currentTrack, isPlaying, currentTime, duration, playTrack, pauseTrack, resumeTrack, nextTrack, previousTrack, seekTo } = useMusicPlayer()
  
  const [playlist, setPlaylist] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [removedSongs, setRemovedSongs] = useState<any[]>([])
  const [playlistSongs, setPlaylistSongs] = useState<{ [playlistId: string]: any[]; }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [draggedTrack, setDraggedTrack] = useState<any>(null)
  const [playlistDetails, setPlaylistDetails] = useState<{ [playlistId: string]: any }>({})

  // Create sortedSelectedPlaylists from selectedPlaylists
  const sortedSelectedPlaylists = selectedPlaylists
    .map(id => playlists.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name));

  useEffect(() => {
    if (playlistId && user) {
      loadPlaylistData()
    }
  }, [playlistId, user])

  useEffect(() => {
    if (user) {
      loadPlaylistSongs()
      if (playlists.length === 0) {
        fetchPlaylists()
      }
    }
  }, [user, selectedPlaylists])

  useEffect(() => {
    if (playlists.length > 0) {
      fetchPlaylistDetails()
    }
  }, [playlists])

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

  const loadPlaylistSongs = async () => {
    try {
      const { data } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .in('spotify_playlist_id', selectedPlaylists)
        .is('removed_at', null)
        .order('added_to_app_at', { ascending: false });

      if (data) {
        const songsByPlaylist = data.reduce((acc, song) => {
          if (!acc[song.spotify_playlist_id]) {
            acc[song.spotify_playlist_id] = [];
          }
          acc[song.spotify_playlist_id].push(song);
          return acc;
        }, {} as { [playlistId: string]: any[]; });
        setPlaylistSongs(songsByPlaylist);
      }
    } catch (error) {
      console.error('Error loading playlist songs:', error);
    }
  }

  const fetchPlaylistDetails = async () => {
    try {
      const details: { [playlistId: string]: any } = {};
      for (const playlist of playlists) {
        const response = await supabase.functions.invoke('spotify-api', {
          body: { action: 'get_playlist_details', playlistId: playlist.id }
        });
        if (response.data?.success) {
          details[playlist.id] = response.data.playlist;
        }
      }
      setPlaylistDetails(details);
    } catch (error) {
      console.error('Error fetching playlist details:', error);
    }
  };

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

  const reorderSongs = async (reorderedSongs: any[]) => {
    try {
      setSongs(reorderedSongs);

      for (let i = 0; i < reorderedSongs.length; i++) {
        const song = reorderedSongs[i];
        const newTimestamp = new Date(Date.now() - (reorderedSongs.length - i) * 1000).toISOString();
        
        await supabase
          .from('playlist_songs')
          .update({ added_to_app_at: newTimestamp })
          .eq('user_id', user?.id)
          .eq('spotify_playlist_id', playlist.spotify_playlist_id)
          .eq('spotify_track_id', song.spotify_track_id);
      }
      
      toast.success('Song order updated');
    } catch (error) {
      console.error('Error reordering songs:', error);
      toast.error('Failed to reorder songs');
      await loadPlaylistData();
    }
  };

  const handleDragStart = (e: React.DragEvent, track: any, index?: number) => {
    setDraggedTrack(track);
    if (index !== undefined) {
      setDraggedIndex(index);
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', track.spotify_track_id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex?: number, targetPlaylistId?: string) => {
    e.preventDefault();
    
    if (targetPlaylistId && draggedTrack) {
      // Dropping on another playlist
      addSongToSelectedPlaylist(draggedTrack, targetPlaylistId);
    } else if (dropIndex !== undefined && draggedIndex !== null && draggedIndex !== dropIndex) {
      // Reordering within the same playlist
      const newSongs = [...songs];
      const [removed] = newSongs.splice(draggedIndex, 1);
      newSongs.splice(dropIndex, 0, removed);
      reorderSongs(newSongs);
    }
    
    setDraggedIndex(null);
    setDraggedTrack(null);
  };

  const addSongToSelectedPlaylist = async (track: any, playlistId: string) => {
    try {
      const existingSongs = playlistSongs[playlistId] || [];
      const isDuplicate = existingSongs.some(song => song.spotify_track_id === track.spotify_track_id);
      if (isDuplicate) {
        toast.error('This song is already in the playlist');
        return;
      }

      const { data: existingSong } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistId)
        .eq('spotify_track_id', track.spotify_track_id)
        .single();

      if (existingSong) {
        if (existingSong.removed_at) {
          await supabase
            .from('playlist_songs')
            .update({
              removed_at: null,
              added_to_app_at: new Date().toISOString(),
            })
            .eq('id', existingSong.id);
        } else {
          toast.error('This song is already in the playlist');
          return;
        }
      } else {
        const songData = {
          user_id: user?.id,
          spotify_playlist_id: playlistId,
          spotify_track_id: track.spotify_track_id,
          track_name: track.track_name,
          artist_name: track.artist_name,
          album_name: track.album_name,
          duration_ms: track.duration_ms,
        };
        await supabase.from('playlist_songs').insert(songData);
      }

      await loadPlaylistSongs();
      toast.success('Song added to playlist');
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      toast.error('Failed to add song to playlist');
    }
  };

  const removeSongFromSelectedPlaylist = async (trackId: string, playlistId: string) => {
    try {
      await supabase
        .from('playlist_songs')
        .update({ removed_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistId)
        .eq('spotify_track_id', trackId);
      
      await loadPlaylistSongs();
      toast.success('Song removed from playlist');
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      toast.error('Failed to remove song from playlist');
    }
  };

  const reorderPlaylistSongs = async (playlistId: string, reorderedSongs: any[]) => {
    try {
      setPlaylistSongs(prev => ({
        ...prev,
        [playlistId]: reorderedSongs
      }));

      for (let i = 0; i < reorderedSongs.length; i++) {
        const song = reorderedSongs[i];
        const newTimestamp = new Date(Date.now() - (reorderedSongs.length - i) * 1000).toISOString();
        
        await supabase
          .from('playlist_songs')
          .update({ added_to_app_at: newTimestamp })
          .eq('user_id', user?.id)
          .eq('spotify_playlist_id', playlistId)
          .eq('spotify_track_id', song.spotify_track_id);
      }
      
      toast.success('Song order updated');
    } catch (error) {
      console.error('Error reordering songs:', error);
      toast.error('Failed to reorder songs');
      await loadPlaylistSongs();
    }
  };

  const copyPlaylist = async (sourcePlaylistId: string) => {
    try {
      const sourcePlaylist = playlists.find(p => p.id === sourcePlaylistId);
      if (!sourcePlaylist) {
        toast.error('Source playlist not found');
        return;
      }

      const newPlaylistName = `${sourcePlaylist.name} (Copy)`;
      
      const { data: tokenData } = await supabase
        .from('spotify_tokens')
        .select('access_token')
        .eq('user_id', user?.id)
        .single();

      if (!tokenData) {
        toast.error('No Spotify token found');
        return;
      }
      
      const response = await fetch('https://api.spotify.com/v1/me/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPlaylistName,
          description: `Copy of ${sourcePlaylist.name}`,
          public: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist on Spotify');
      }

      const newPlaylist = await response.json();

      await supabase
        .from('spotify_playlists')
        .insert({
          user_id: user?.id,
          spotify_playlist_id: newPlaylist.id,
          playlist_name: newPlaylistName,
          is_selected: true
        });

      const sourceSongs = playlistSongs[sourcePlaylistId] || [];
      if (sourceSongs.length > 0) {
        const songsToInsert = sourceSongs.map(song => ({
          user_id: user?.id,
          spotify_playlist_id: newPlaylist.id,
          spotify_track_id: song.spotify_track_id,
          track_name: song.track_name,
          artist_name: song.artist_name,
          album_name: song.album_name,
          duration_ms: song.duration_ms,
          search_year: song.search_year
        }));

        await supabase.from('playlist_songs').insert(songsToInsert);

        const trackIds = sourceSongs.map(song => song.spotify_track_id);
        await updatePlaylist(newPlaylist.id, trackIds);
      }

      await fetchPlaylists();
      await loadPlaylistSongs();
      
      toast.success(`Playlist copied as "${newPlaylistName}"`);
    } catch (error) {
      console.error('Error copying playlist:', error);
      toast.error('Failed to copy playlist');
    }
  };

  const handleViewPlaylist = async (playlistId: string) => {
    const { data: internalPlaylist } = await supabase
      .from('spotify_playlists')
      .select('id')
      .eq('user_id', user?.id)
      .eq('spotify_playlist_id', playlistId)
      .single();

    if (internalPlaylist) {
      navigate(`/playlist/${internalPlaylist.id}`);
    } else {
      toast.error('Playlist not found in database');
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Playlist Details */}
        <div className="lg:col-span-2 space-y-6">
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
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-move hover:bg-gray-50 transition-colors ${
                        index >= 100 ? 'bg-orange-50 border-orange-200' : 'bg-white'
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, song, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="h-4 w-4 text-gray-400" />
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => playTrack(song)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSongFromPlaylist(song.spotify_track_id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </Button>
                      </div>
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

        {/* Right Column - Selected Playlists */}
        <div className="space-y-6 lg:sticky lg:top-4 lg:h-screen lg:overflow-y-auto">
          {selectedPlaylists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Playlists ({selectedPlaylists.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="space-y-4"
                  onDragOver={handleDragOver}
                >
                  {sortedSelectedPlaylists.map(playlist => {
                    if (!playlist) return null;
                    const songs = playlistSongs[playlist.id] || [];
                    return (
                      <div
                        key={playlist.id}
                        onDrop={(e) => handleDrop(e, undefined, playlist.id)}
                      >
                        <ExpandablePlaylistCard
                          playlist={playlist}
                          songs={songs}
                          onViewPlaylist={handleViewPlaylist}
                          onRemoveSong={removeSongFromSelectedPlaylist}
                          onPlaySong={playTrack}
                          onReorderSongs={reorderPlaylistSongs}
                          onCopyPlaylist={copyPlaylist}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Music Player */}
      {currentTrack && (
        <MusicPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={isPlaying ? pauseTrack : resumeTrack}
          onNext={nextTrack}
          onPrevious={previousTrack}
          onSeek={seekTo}
        />
      )}
    </div>
  )
}

export default PlaylistDetail
