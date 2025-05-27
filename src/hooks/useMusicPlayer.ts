
import { useState, useRef, useEffect } from 'react'

interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  preview_url?: string
  duration_ms: number
}

export const useMusicPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playlist, setPlaylist] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      })
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0)
      })
      
      audioRef.current.addEventListener('ended', () => {
        nextTrack()
      })
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeEventListener('timeupdate', () => {})
        audioRef.current.removeEventListener('loadedmetadata', () => {})
        audioRef.current.removeEventListener('ended', () => {})
      }
    }
  }, [])

  const playTrack = (track: Track, trackList?: Track[]) => {
    if (!track.preview_url) {
      console.warn('No preview URL available for this track')
      return
    }

    setCurrentTrack(track)
    
    if (trackList) {
      setPlaylist(trackList)
      const index = trackList.findIndex(t => t.id === track.id)
      setCurrentIndex(index)
    } else {
      setPlaylist([track])
      setCurrentIndex(0)
    }
    
    if (audioRef.current) {
      audioRef.current.src = track.preview_url
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const resumeTrack = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const nextTrack = () => {
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1
      const nextTrack = playlist[nextIndex]
      setCurrentIndex(nextIndex)
      playTrack(nextTrack)
    } else {
      // End of playlist
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const previousTrack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      const prevTrack = playlist[prevIndex]
      setCurrentIndex(prevIndex)
      playTrack(prevTrack)
    }
  }

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    seekTo
  }
}
