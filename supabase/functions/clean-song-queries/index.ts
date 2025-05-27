
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { queries } = await req.json()
    
    if (!queries || typeof queries !== 'string') {
      throw new Error('No queries provided')
    }

    const lines = queries.split('\n').filter(line => line.trim())
    const cleanedLines = lines.map(line => {
      let cleaned = line.trim()
      
      // Remove common metadata patterns that appear in track listings
      cleaned = cleaned.replace(/^\d+\.\s*/, '') // Remove numbering "1. "
      cleaned = cleaned.replace(/\$\d+\.\d+$/, '') // Remove price at end "$1.49"
      cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}$/, '') // Remove release date "2025-02-28"
      cleaned = cleaned.replace(/\d{3} BPM.*$/, '') // Remove BPM and key info
      cleaned = cleaned.replace(/^\w+\s*\/\s*/, '') // Remove "Genre /" prefix
      cleaned = cleaned.replace(/^.*\s*\/\s*/, '') // Remove label info before "/"
      
      // Split into parts to identify track name and artist
      const parts = cleaned.split(/\s*–\s*|\s*-\s*/)
      if (parts.length >= 2) {
        const artist = parts[0].trim()
        const trackPart = parts[1].trim()
        
        // Extract remix info and put it in brackets
        const remixPatterns = [
          /(Original|Extended|Radio|Club|Vocal|Instrumental|Dub|Acid|Deep|Tech|Progressive)\s*(Mix|Version|Edit)/gi,
          /(Remix|Mix|Edit|Version|Bootleg|Rework|Flip)$/gi
        ]
        
        let remixInfo = ''
        let cleanTrack = trackPart
        
        remixPatterns.forEach(pattern => {
          const match = cleanTrack.match(pattern)
          if (match) {
            remixInfo = match[0]
            cleanTrack = cleanTrack.replace(pattern, '').trim()
          }
        })
        
        // Construct the cleaned query
        if (remixInfo) {
          cleaned = `${artist} – ${cleanTrack} [${remixInfo}]`
        } else {
          cleaned = `${artist} – ${cleanTrack}`
        }
      } else {
        // Fallback: just extract remix info from single line
        let remixInfo = ''
        const remixPatterns = [
          /(Original|Extended|Radio|Club|Vocal|Instrumental|Dub|Acid|Deep|Tech|Progressive)\s*(Mix|Version|Edit)/gi,
          /(Remix|Mix|Edit|Version|Bootleg|Rework|Flip)$/gi
        ]
        
        remixPatterns.forEach(pattern => {
          const match = cleaned.match(pattern)
          if (match) {
            remixInfo = match[0]
            cleaned = cleaned.replace(pattern, '').trim()
          }
        })
        
        if (remixInfo) {
          cleaned = `${cleaned} [${remixInfo}]`
        }
      }
      
      return cleaned
    })

    return new Response(JSON.stringify({
      success: true,
      cleanedQueries: cleanedLines.join('\n')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Clean song queries error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
