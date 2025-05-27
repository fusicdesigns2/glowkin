
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

  const searchSongs = async (queries: string[], targetYear?: number) => {
    const yearToSearch = targetYear || currentYear
    setIsSearching(true)
    
    try {
      const cleanQueries = queries.map(cleanQueryForSearch)
      
      const response = await supabase.functions.invoke('spotify-api', {
        body: { 
          action: 'search_songs', 
          searchQueries: cleanQueries,
          year: yearToSearch
        }
      })

      if (response.data?.success) {
        const newResults = response.data.results.map((result: SearchResult) => ({
          ...result,
          query: queries[cleanQueries.indexOf(result.query)] || result.query // Use original query with brackets
        }))
        
        // Add year to searched years if not already there
        if (!searchedYears.includes(yearToSearch)) {
          setSearchedYears(prev => [...prev, yearToSearch].sort((a, b) => b - a))
        }
        
        // Merge with existing results
        setSearchResults(prev => {
          const merged = [...prev]
          
          newResults.forEach((newResult: SearchResult) => {
            const existingIndex = merged.findIndex(r => r.query === newResult.query && r.year === newResult.year)
            if (existingIndex >= 0) {
              // Replace existing result for same query and year
              merged[existingIndex] = newResult
            } else {
              merged.push(newResult)
            }
          })
          
          return merged
        })
        
        const foundCount = newResults.filter((r: SearchResult) => r.tracks.length > 0).length
        toast.success(`Found matches for ${foundCount}/${queries.length} songs in ${yearToSearch}`)
        
        return newResults
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

  const searchYear = async (year: number, queries: string[]) => {
    setCurrentYear(year)
    return await searchSongs(queries, year)
  }

  const clearResults = () => {
    setSearchResults([])
    setSearchedYears([new Date().getFullYear()])
    setCurrentYear(new Date().getFullYear())
  }

  return {
    searchResults,
    searchedYears,
    currentYear,
    isSearching,
    searchSongs,
    searchYear,
    clearResults
  }
}
