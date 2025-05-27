
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  duration_ms: number
  foundYear?: number
}

interface SearchResult {
  query: string
  tracks: SpotifyTrack[]
}

export const useSpotifySearch = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchedYears, setSearchedYears] = useState<number[]>([])
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [isSearching, setIsSearching] = useState(false)

  const cleanQueryForSearch = (query: string) => {
    // Remove brackets and their contents for searching
    return query.replace(/\s*\[.*?\]\s*/g, '').trim()
  }

  const searchSongs = async (queries: string[], targetYears?: number[]) => {
    const yearsToSearch = targetYears || [currentYear]
    setIsSearching(true)
    
    try {
      const allResults: { [query: string]: SpotifyTrack[] } = {}
      
      // Initialize results for each query
      queries.forEach(query => {
        allResults[query] = []
      })
      
      for (const year of yearsToSearch) {
        const cleanQueries = queries.map(cleanQueryForSearch)
        
        const response = await supabase.functions.invoke('spotify-api', {
          body: { 
            action: 'search_songs', 
            searchQueries: cleanQueries,
            year: year
          }
        })

        if (response.data?.success) {
          response.data.results.forEach((result: any) => {
            const originalQuery = queries[cleanQueries.indexOf(result.query)] || result.query
            
            // Add year info to each track
            const tracksWithYear = result.tracks.map((track: SpotifyTrack) => ({
              ...track,
              foundYear: year
            }))
            
            // Merge tracks for this query
            allResults[originalQuery] = [...(allResults[originalQuery] || []), ...tracksWithYear]
          })
        }
      }
      
      // Convert to array format and remove duplicates
      const finalResults = Object.entries(allResults).map(([query, tracks]) => ({
        query,
        tracks: tracks.filter((track, index, self) => 
          index === self.findIndex(t => t.id === track.id)
        )
      }))
      
      // Add years to searched years
      yearsToSearch.forEach(year => {
        if (!searchedYears.includes(year)) {
          setSearchedYears(prev => [...prev, year].sort((a, b) => b - a))
        }
      })
      
      // Merge with existing results
      setSearchResults(prev => {
        const merged = [...prev]
        
        finalResults.forEach((newResult: SearchResult) => {
          const existingIndex = merged.findIndex(r => r.query === newResult.query)
          if (existingIndex >= 0) {
            // Merge tracks and remove duplicates
            const existingTracks = merged[existingIndex].tracks
            const allTracks = [...existingTracks, ...newResult.tracks]
            merged[existingIndex].tracks = allTracks.filter((track, index, self) => 
              index === self.findIndex(t => t.id === track.id)
            )
          } else {
            merged.push(newResult)
          }
        })
        
        return merged
      })
      
      const foundCount = finalResults.filter((r: SearchResult) => r.tracks.length > 0).length
      toast.success(`Found matches for ${foundCount}/${queries.length} searches across ${yearsToSearch.length} year(s)`)
      
      return finalResults
    } catch (error) {
      console.error('Error searching songs:', error)
      toast.error('Failed to search for songs')
      return []
    } finally {
      setIsSearching(false)
    }
  }

  const searchYear = async (year: number, queries: string[]) => {
    setCurrentYear(year)
    return await searchSongs(queries, [year])
  }

  const searchMultipleYears = async (years: number[], queries: string[]) => {
    return await searchSongs(queries, years)
  }

  const clearResults = () => {
    setSearchResults([])
    setSearchedYears([])
    setCurrentYear(new Date().getFullYear())
  }

  return {
    searchResults,
    searchedYears,
    currentYear,
    isSearching,
    searchSongs,
    searchYear,
    searchMultipleYears,
    clearResults
  }
}
