
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  duration_ms: number
}

interface SearchResult {
  query: string
  tracks: SpotifyTrack[]
  year: number
}

export const useSpotifySearch = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [isSearching, setIsSearching] = useState(false)

  const searchSongs = async (queries: string[]) => {
    setIsSearching(true)
    try {
      const response = await supabase.functions.invoke('spotify-api', {
        body: { 
          action: 'search_songs', 
          searchQueries: queries,
          year: currentYear
        }
      })

      if (response.data?.success) {
        setSearchResults(response.data.results)
        
        const foundCount = response.data.results.filter((r: SearchResult) => r.tracks.length > 0).length
        toast.success(`Found matches for ${foundCount}/${queries.length} songs in ${currentYear}`)
        
        return response.data.results
      } else {
        throw new Error(response.data?.error || 'Search failed')
      }
    } catch (error) {
      console.error('Error searching songs:', error)
      toast.error('Failed to search for songs')
      return []
    } finally {
      setIsSearching(false)
    }
  }

  const searchPreviousYear = async (queries: string[]) => {
    const newYear = currentYear - 1
    setCurrentYear(newYear)
    
    const newResults = await searchSongs(queries)
    
    // Merge with existing results, avoiding duplicates
    setSearchResults(prev => {
      const merged = [...prev]
      
      newResults.forEach((newResult: SearchResult) => {
        const existingIndex = merged.findIndex(r => r.query === newResult.query)
        if (existingIndex >= 0) {
          // Add tracks from new year to existing query results
          const existingTracks = merged[existingIndex].tracks
          const newTracks = newResult.tracks.filter(
            track => !existingTracks.some(existing => existing.id === track.id)
          )
          merged[existingIndex].tracks = [...existingTracks, ...newTracks]
        } else {
          merged.push(newResult)
        }
      })
      
      return merged
    })
    
    return newResults
  }

  const clearResults = () => {
    setSearchResults([])
    setCurrentYear(new Date().getFullYear())
  }

  return {
    searchResults,
    currentYear,
    isSearching,
    searchSongs,
    searchPreviousYear,
    clearResults
  }
}
