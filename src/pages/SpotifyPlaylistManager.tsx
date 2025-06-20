import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { useSpotifyPlaylists } from '@/hooks/useSpotifyPlaylists';
import { useSpotifySearch } from '@/hooks/useSpotifySearch';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Music, Search, Plus, Play, Clock, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MusicPlayer } from '@/components/MusicPlayer';
import { ExpandablePlaylistCard } from '@/components/ExpandablePlaylistCard';

const SpotifyPlaylistManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { spotifyUser, hasValidToken, isLoading: authLoading, initiateSpotifyAuth } = useSpotifyAuth();
  const { playlists, selectedPlaylists, isLoading: playlistsLoading, fetchPlaylists, togglePlaylistSelection, updatePlaylist } = useSpotifyPlaylists();
  const { searchResults, searchedYears, currentYear, isSearching, searchSongs, searchYear, searchMultipleYears, clearResults } = useSpotifySearch();
  const { currentTrack, isPlaying, currentTime, duration, playTrack, pauseTrack, resumeTrack, nextTrack, previousTrack, seekTo } = useMusicPlayer();
  
  const [songQueries, setSongQueries] = useState('');
  const [playlistSongs, setPlaylistSongs] = useState<{ [playlistId: string]: any[]; }>({});
  const [isUpdatingPlaylists, setIsUpdatingPlaylists] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [draggedTrack, setDraggedTrack] = useState<any>(null);
  const [playlistDetails, setPlaylistDetails] = useState<{ [playlistId: string]: any }>({});

  // Create sortedSelectedPlaylists from selectedPlaylists
  const sortedSelectedPlaylists = selectedPlaylists
    .map(id => playlists.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name));

  useEffect(() => {
    if (hasValidToken && playlists.length === 0) {
      fetchPlaylists();
    }
  }, [hasValidToken]);

  useEffect(() => {
    if (user) {
      loadPlaylistSongs();
    }
  }, [user, selectedPlaylists]);

  useEffect(() => {
    if (hasValidToken && playlists.length > 0) {
      updatePlaylistsInDatabase();
      fetchPlaylistDetails();
    }
  }, [playlists, user]);

  const updatePlaylistsInDatabase = async () => {
    if (!user || playlists.length === 0) return;
    try {
      const { data: existingPlaylists } = await supabase
        .from('spotify_playlists')
        .select('spotify_playlist_id')
        .eq('user_id', user.id);
      
      const existingPlaylistIds = new Set(existingPlaylists?.map(p => p.spotify_playlist_id) || []);
      const playlistsToStore = playlists
        .filter((playlist: any) => !existingPlaylistIds.has(playlist.id))
        .map((playlist: any) => ({
          user_id: user.id,
          spotify_playlist_id: playlist.id,
          playlist_name: playlist.name,
          is_selected: selectedPlaylists.includes(playlist.id)
        }));

      if (playlistsToStore.length > 0) {
        await supabase.from('spotify_playlists').insert(playlistsToStore);
        console.log(`Added ${playlistsToStore.length} new playlists to database`);
      }

      await fetchAndStoreSongsForPlaylists();
    } catch (error) {
      console.error('Error updating playlists in database:', error);
    }
  };

  const fetchAndStoreSongsForPlaylists = async () => {
    if (!user) return;
    try {
      for (const playlist of playlists) {
        const response = await supabase.functions.invoke('spotify-api', {
          body: { action: 'get_playlist_tracks', playlistId: playlist.id }
        });

        if (response.data?.success && response.data.tracks) {
          const tracks = response.data.tracks;
          const { data: existingSongs } = await supabase
            .from('playlist_songs')
            .select('spotify_track_id')
            .eq('user_id', user.id)
            .eq('spotify_playlist_id', playlist.id);
          
          const existingTrackIds = new Set(existingSongs?.map(s => s.spotify_track_id) || []);
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
            }));

          if (songsToInsert.length > 0) {
            await supabase.from('playlist_songs').insert(songsToInsert);
          }

          const { data: existingPlaylistSongs } = await supabase
            .from('songs_in_playlist')
            .select('track_id')
            .eq('user_id', user.id)
            .eq('playlist_id', playlist.id);
          
          const existingPlaylistTrackIds = new Set(existingPlaylistSongs?.map(s => s.track_id) || []);
          const playlistSongsToInsert = tracks
            .filter((track: any) => !existingPlaylistTrackIds.has(track.id))
            .map((track: any) => ({
              user_id: user.id,
              playlist_id: playlist.id,
              track_id: track.id
            }));

          if (playlistSongsToInsert.length > 0) {
            await supabase.from('songs_in_playlist').insert(playlistSongsToInsert);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching and storing songs for playlists:', error);
    }
  };

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
  };

  const cleanUpQueries = async () => {
    if (!songQueries.trim()) {
      toast.error('Please enter song queries first');
      return;
    }
    setIsCleaningUp(true);
    try {
      const response = await supabase.functions.invoke('clean-song-queries', {
        body: { queries: songQueries }
      });
      if (response.data?.success) {
        setSongQueries(response.data.cleanedQueries);
        clearResults();
        toast.success('Song queries cleaned up using AI!');
      } else {
        throw new Error(response.data?.error || 'Failed to clean up queries');
      }
    } catch (error) {
      console.error('Error cleaning up queries:', error);
      toast.error('Failed to clean up queries');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleSearch = async () => {
    const queries = songQueries.split('\n').filter(q => q.trim()).slice(0, 25);
    if (queries.length === 0) {
      toast.error('Please enter at least one song query');
      return;
    }
    await searchMultipleYears([2025, 2024, 2023], queries);
  };

  const handleYearClick = async (year: number) => {
    const queries = songQueries.split('\n').filter(q => q.trim()).slice(0, 25);
    if (queries.length === 0) {
      toast.error('Please enter song queries first');
      return;
    }
    await searchYear(year, queries);
  };

  const handleYearRangeClick = async (years: number[]) => {
    const queries = songQueries.split('\n').filter(q => q.trim()).slice(0, 25);
    if (queries.length === 0) {
      toast.error('Please enter song queries first');
      return;
    }
    await searchMultipleYears(years, queries);
  };

  const addSongToPlaylist = async (track: any, playlistId: string) => {
    try {
      const existingSongs = playlistSongs[playlistId] || [];
      const isDuplicate = existingSongs.some(song => song.spotify_track_id === track.id);
      if (isDuplicate) {
        toast.error('This song is already in the playlist');
        return;
      }

      const { data: existingSong } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('spotify_playlist_id', playlistId)
        .eq('spotify_track_id', track.id)
        .single();

      if (existingSong) {
        if (existingSong.removed_at) {
          await supabase
            .from('playlist_songs')
            .update({
              removed_at: null,
              added_to_app_at: new Date().toISOString(),
              search_year: currentYear
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
          spotify_track_id: track.id,
          track_name: track.name,
          artist_name: track.artists.map((a: any) => a.name).join(', '),
          album_name: track.album.name,
          duration_ms: track.duration_ms,
          search_year: currentYear
        };
        await supabase.from('playlist_songs').insert(songData);
      }

      const { data: existingPlaylistSong } = await supabase
        .from('songs_in_playlist')
        .select('*')
        .eq('user_id', user?.id)
        .eq('playlist_id', playlistId)
        .eq('track_id', track.id)
        .single();

      if (!existingPlaylistSong) {
        await supabase.from('songs_in_playlist').insert({
          user_id: user?.id,
          playlist_id: playlistId,
          track_id: track.id
        });
      }
      
      await loadPlaylistSongs();
      toast.success('Song added to playlist');
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      toast.error('Failed to add song to playlist');
    }
  };

  const removeSongFromPlaylist = async (trackId: string, playlistId: string) => {
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

  const handleUpdateAllPlaylists = async () => {
    setIsUpdatingPlaylists(true);
    try {
      for (const playlistId of selectedPlaylists) {
        const songs = playlistSongs[playlistId] || [];
        const trackIds = songs.slice(0, 100).map(song => song.spotify_track_id);
        
        if (trackIds.length > 0) {
          await updatePlaylist(playlistId, trackIds);
          if (songs.length > 100) {
            const excessSongs = songs.slice(100);
            for (const song of excessSongs) {
              await supabase
                .from('playlist_songs')
                .update({ removed_at: new Date().toISOString() })
                .eq('user_id', user?.id)
                .eq('spotify_playlist_id', playlistId)
                .eq('spotify_track_id', song.spotify_track_id);
            }
          }
        }
      }
      toast.success('All playlists updated successfully!');
      await loadPlaylistSongs();
    } catch (error) {
      console.error('Error updating playlists:', error);
      toast.error('Failed to update some playlists');
    } finally {
      setIsUpdatingPlaylists(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, track: any) => {
    console.log('Drag started with track:', track.name);
    setDraggedTrack(track);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', track.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, playlistId: string) => {
    e.preventDefault();
    console.log('Drop event on playlist:', playlistId, 'with track:', draggedTrack?.name);
    if (draggedTrack) {
      addSongToPlaylist(draggedTrack, playlistId);
      setDraggedTrack(null);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const reorderPlaylistSongs = async (playlistId: string, reorderedSongs: any[]) => {
    try {
      // Update the local state first for immediate feedback
      setPlaylistSongs(prev => ({
        ...prev,
        [playlistId]: reorderedSongs
      }));

      // Update the order in the database by updating the added_to_app_at timestamps
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
      // Reload to get the correct order back
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
      
      // Get Spotify access token from database
      const { data: tokenData } = await supabase
        .from('spotify_tokens')
        .select('access_token')
        .eq('user_id', user?.id)
        .single();

      if (!tokenData) {
        toast.error('No Spotify token found');
        return;
      }
      
      // Create new playlist on Spotify
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

      // Add to our database
      await supabase
        .from('spotify_playlists')
        .insert({
          user_id: user?.id,
          spotify_playlist_id: newPlaylist.id,
          playlist_name: newPlaylistName,
          is_selected: true
        });

      // Copy songs from source playlist
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

        // Add tracks to Spotify playlist
        const trackIds = sourceSongs.map(song => song.spotify_track_id);
        await updatePlaylist(newPlaylist.id, trackIds);
      }

      // Refresh playlists
      await fetchPlaylists();
      await loadPlaylistSongs();
      
      toast.success(`Playlist copied as "${newPlaylistName}"`);
    } catch (error) {
      console.error('Error copying playlist:', error);
      toast.error('Failed to copy playlist');
    }
  };

  const getYearColor = (year: number) => {
    const colors = {
      2025: 'bg-blue-100 text-blue-800 border-blue-200',
      2024: 'bg-green-100 text-green-800 border-green-200',
      2023: 'bg-purple-100 text-purple-800 border-purple-200',
      2022: 'bg-orange-100 text-orange-800 border-orange-200',
      2021: 'bg-red-100 text-red-800 border-red-200',
      2020: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      2019: 'bg-pink-100 text-pink-800 border-pink-200',
      2018: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      2017: 'bg-gray-100 text-gray-800 border-gray-200',
      2016: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      2015: 'bg-lime-100 text-lime-800 border-lime-200'
    };
    return colors[year as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleViewPlaylist = async (playlistId: string) => {
    // Get our internal playlist record using spotify_playlist_id
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
    );
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
    );
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
          <Card className="bg-black">
            <CardHeader className="bg-black">
              <CardTitle className="flex items-center gap-2 text-white">
                <Search className="h-6 w-6" />
                Search Songs
              </CardTitle>
              <CardDescription className="text-white">
                Enter up to 25 song queries (one per line). Initial search covers 2025-2023.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 bg-black">
              <div className="relative">
                <Textarea
                  placeholder="Enter song queries here, one per line&#10;Example:&#10;Shape of You Ed Sheeran&#10;Blinding Lights The Weeknd&#10;Watermelon Sugar Harry Styles"
                  value={songQueries}
                  onChange={(e) => setSongQueries(e.target.value)}
                  rows={6}
                  className="bg-black text-white placeholder:text-gray-400 border-gray-600"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={cleanUpQueries} disabled={isCleaningUp} variant="outline">
                  {isCleaningUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Clean up
                    </>
                  )}
                </Button>
                
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search 2025-2023
                    </>
                  )}
                </Button>
              </div>

              {/* Year Selection - Always Visible */}
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-sm font-medium text-white">Years:</span>
                
                {/* Individual years */}
                {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map(year => (
                  <Button
                    key={year}
                    variant={searchedYears.includes(year) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleYearClick(year)}
                    disabled={isSearching}
                  >
                    {year}
                  </Button>
                ))}
                
                {/* Year range buttons */}
                <Button
                  variant={searchedYears.some(year => [2022, 2021, 2020].includes(year)) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleYearRangeClick([2022, 2021, 2020])}
                  disabled={isSearching}
                >
                  2022-2020
                </Button>
                <Button
                  variant={searchedYears.some(year => [2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].includes(year)) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleYearRangeClick([2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010])}
                  disabled={isSearching}
                >
                  2019-2010
                </Button>
                <Button
                  variant={searchedYears.length >= 16 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleYearRangeClick([2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010])}
                  disabled={isSearching}
                >
                  All Years
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card>
              <CardHeader className="bg-black">
                <CardTitle className="text-white">Search Results</CardTitle>
                <CardDescription className="text-white">
                  Drag songs to playlists on the right or use the dropdown menu to add them
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-zinc-950">
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={`${result.query}-${index}`} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-amber-100">
                        Query: "{result.query}"
                      </h4>
                      {result.tracks.length > 0 ? (
                        <div className="grid gap-2">
                          {result.tracks.map((track, trackIndex) => (
                            <div
                              key={track.id}
                              className={`flex items-center justify-between p-2 border rounded cursor-move hover:bg-gray-50 transition-colors ${
                                trackIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                              }`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, track)}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{track.name}</div>
                                <div className="text-sm text-gray-600">
                                  {track.artists.map(a => a.name).join(', ')} • {track.album.name}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(track.duration_ms)}
                                  {track.foundYear && (
                                    <Badge variant="outline" className={`ml-2 ${getYearColor(track.foundYear)}`}>
                                      {track.foundYear}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => playTrack(track)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
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
                                        const isAdded = playlistSongs[playlist!.id]?.some(s => s.spotify_track_id === track.id);
                                        return (
                                          <DropdownMenuItem
                                            key={playlist!.id}
                                            onClick={() => isAdded ? removeSongFromPlaylist(track.id, playlist!.id) : addSongToPlaylist(track, playlist!.id)}
                                          >
                                            {isAdded ? '✓ ' : ''}{playlist!.name}
                                          </DropdownMenuItem>
                                        );
                                      })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-300 italic text-center py-4 text-sm">
                          No matches found
                        </div>
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
                  {playlists.map(playlist => (
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
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <span>{playlist.tracks.total} tracks</span>
                          {playlistDetails[playlist.id]?.followers && (
                            <span>• {playlistDetails[playlist.id].followers.total} saves</span>
                          )}
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
                  <Button onClick={handleUpdateAllPlaylists} disabled={isUpdatingPlaylists} size="sm">
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
                    if (!playlist) return null;
                    const songs = playlistSongs[playlist.id] || [];
                    return (
                      <ExpandablePlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        songs={songs}
                        onViewPlaylist={handleViewPlaylist}
                        onRemoveSong={removeSongFromPlaylist}
                        onPlaySong={playTrack}
                        onReorderSongs={reorderPlaylistSongs}
                        onCopyPlaylist={copyPlaylist}
                      />
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
  );
};

export default SpotifyPlaylistManager;
