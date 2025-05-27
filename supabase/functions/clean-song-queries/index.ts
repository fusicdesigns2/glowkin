
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
      
      // Remove numbering at the start "1.", "2.", etc.
      cleaned = cleaned.replace(/^\d+\.?\s*/, '')
      
      // Remove price at end "$1.49"
      cleaned = cleaned.replace(/\$\d+\.\d+\s*$/, '')
      
      // Remove release date "2025-02-28"
      cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}\s*$/, '')
      
      // Remove BPM and key info "128 BPM - Ab Minor"
      cleaned = cleaned.replace(/\d{2,3}\s*BPM\s*-\s*[A-G][b#]?\s*(Major|Minor|major|minor)\s*$/, '')
      
      // Remove genre info at the end if it's a single word
      cleaned = cleaned.replace(/\s+(House|Tech House|Funky House|Progressive|Trance|Techno|Dance|Electronic)\s*$/, '')
      
      // Remove label info that appears after artist but before track
      cleaned = cleaned.replace(/\n.*?(?=\n\d+|$)/g, '')
      
      // Handle multiline format where title is on one line, artist on another
      const titleMatch = cleaned.match(/^(.+?)\s*\n(.+)/)
      if (titleMatch) {
        const title = titleMatch[1].trim()
        const artist = titleMatch[2].trim()
        cleaned = `${artist} – ${title}`
      }
      
      // Look for remix/mix info and put it in brackets
      const remixPatterns = [
        /\b(Original|Extended|Radio|Club|Vocal|Instrumental|Dub|Acid|Deep|Tech|Progressive|Radio Edit|Club Mix|Vocal Mix|Dub Mix)\s*(Mix|Version|Edit)\b/gi,
        /\b(Remix|Mix|Edit|Version|Bootleg|Rework|Flip)\b(?!\s*\])/gi
      ]
      
      let remixInfo = ''
      
      remixPatterns.forEach(pattern => {
        const matches = cleaned.match(pattern)
        if (matches) {
          remixInfo = matches[0]
          cleaned = cleaned.replace(pattern, '').trim()
        }
      })
      
      // Clean up extra spaces and dashes
      cleaned = cleaned.replace(/\s+/g, ' ').trim()
      cleaned = cleaned.replace(/\s*–\s*$/, '').trim()
      
      // Add remix info in brackets if found
      if (remixInfo) {
        cleaned = `${cleaned} [${remixInfo}]`
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
