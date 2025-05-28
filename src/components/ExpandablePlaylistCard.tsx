
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Eye, ExternalLink, Play, GripVertical, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface Song {
  id: string
  spotify_track_id: string
  track_name: string
  artist_name: string
  album_name: string
  duration_ms: number
  added_to_app_at: string
  search_year?: number
}

interface ExpandablePlaylistCardProps {
  playlist: any
  songs: Song[]
  onViewPlaylist: (playlistId: string) => void
  onRemoveSong: (trackId: string, playlistId: string) => void
  onPlaySong: (track: any, trackList: any[]) => void
  onReorderSongs: (playlistId: string, reorderedSongs: Song[]) => void
  onCopyPlaylist: (playlistId: string) => void
}

export const ExpandablePlaylistCard: React.FC<ExpandablePlaylistCardProps> = ({
  playlist,
  songs,
  onViewPlaylist,
  onRemoveSong,
  onPlaySong,
  onReorderSongs,
  onCopyPlaylist
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const reorderedSongs = [...songs]
    const [draggedSong] = reorderedSongs.splice(draggedIndex, 1)
    reorderedSongs.splice(dropIndex, 0, draggedSong)
    
    onReorderSongs(playlist.id, reorderedSongs)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const convertToTrack = (song: Song) => ({
    id: song.spotify_track_id,
    name: song.track_name,
    artists: [{ name: song.artist_name }],
    album: { name: song.album_name },
    duration_ms: song.duration_ms,
    preview_url: `https://p.scdn.co/mp3-preview/${song.spotify_track_id}`
  })

  const playlistTracks = songs.map(convertToTrack)

  return (
    <Card className="border-2 border-dashed border-gray-200 rounded-lg transition-colors hover:border-blue-300">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold truncate">{playlist.name}</h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {songs.length}/100
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopyPlaylist(playlist.id)}
              title="Copy playlist"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewPlaylist(playlist.id)}
              title="View playlist details"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`https://open.spotify.com/playlist/${playlist.id}`, '_blank')}
              title="Open in Spotify"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-2">
          {songs.length > 0 && `Last updated: ${new Date(songs[0].added_to_app_at).toLocaleDateString()}`}
        </div>
        
        {!isExpanded ? (
          songs.length > 0 ? (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {songs.slice(0, 5).map((song, index) => (
                <div key={song.id} className="text-xs flex items-center justify-between p-1 bg-gray-50 rounded">
                  <div className="truncate">
                    <span className="font-medium">{song.track_name}</span>
                    <span className="text-gray-500"> • {song.artist_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 text-green-600 hover:text-green-700"
                      onClick={() => onPlaySong(convertToTrack(song), playlistTracks)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSong(song.spotify_track_id, playlist.id);
                      }}
                    >
                      ✕
                    </Button>
                  </div>
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
          )
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className={`flex items-center gap-2 p-2 border rounded cursor-move transition-colors ${
                  draggedIndex === index ? 'opacity-50' : 'hover:bg-gray-50'
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
                <div className="text-xs text-gray-500 w-8">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{song.track_name}</div>
                  <div className="text-xs text-gray-600">
                    {song.artist_name} • {song.album_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(song.duration_ms)}
                    {song.search_year && ` • ${song.search_year}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                    onClick={() => onPlaySong(convertToTrack(song), playlistTracks)}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSong(song.spotify_track_id, playlist.id);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
