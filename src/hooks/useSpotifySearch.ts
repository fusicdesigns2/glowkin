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
      const allResults: SearchResult[] = []
      
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
          const yearResults = response.data.results.map((result: SearchResult) => ({
            ...result,
            query: queries[cleanQueries.indexOf(result.query)] || result.query,
            year: year
          }))
          
          allResults.push(...yearResults)
        }
      }
      
      // Add years to searched years
      yearsToSearch.forEach(year => {
        if (!searchedYears.includes(year)) {
          setSearchedYears(prev => [...prev, year].sort((a, b) => b - a))
        }
      })
      
      // Merge with existing results, keeping all previous results
      setSearchResults(prev => {
        const merged = [...prev]
        
        allResults.forEach((newResult: SearchResult) => {
          const existingIndex = merged.findIndex(r => r.query === newResult.query && r.year === newResult.year)
          if (existingIndex >= 0) {
            merged[existingIndex] = newResult
          } else {
            merged.push(newResult)
          }
        })
        
        return merged
      })
      
      const foundCount = allResults.filter((r: SearchResult) => r.tracks.length > 0).length
      toast.success(`Found matches for ${foundCount}/${queries.length * yearsToSearch.length} searches`)
      
      return allResults
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
