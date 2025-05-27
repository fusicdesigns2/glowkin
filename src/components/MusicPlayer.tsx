
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  preview_url?: string
  duration_ms: number
}

interface MusicPlayerProps {
  track: Track
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (time: number) => void
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek
}) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSeek = (value: number[]) => {
    onSeek(value[0])
  }

  if (!track.preview_url) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-200 p-4 z-50">
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="p-4 text-center">
            <div className="text-sm text-yellow-800">
              Preview not available for "{track.name}" by {track.artists.map(a => a.name).join(', ')}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-200 p-4 z-50">
      <Card className="bg-white">
        <div className="flex items-center justify-between p-4">
          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{track.name}</div>
            <div className="text-sm text-gray-600 truncate">
              {track.artists.map(a => a.name).join(', ')}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mx-8">
            <Button
              size="sm"
              variant="ghost"
              onClick={onPrevious}
              className="rounded-full"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              onClick={onPlayPause}
              className="rounded-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onNext}
              className="rounded-full"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-12">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
