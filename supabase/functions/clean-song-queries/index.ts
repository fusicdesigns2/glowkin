
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
      
      // Extract remix info and put it in brackets
      const remixPatterns = [
        /(\s+remix)/gi,
        /(\s+mix)/gi,
        /(\s+edit)/gi,
        /(\s+version)/gi,
        /(\s+bootleg)/gi,
        /(\s+rework)/gi,
        /(\s+flip)/gi
      ]
      
      let remixInfo = ''
      remixPatterns.forEach(pattern => {
        const match = cleaned.match(pattern)
        if (match) {
          remixInfo += match[0]
          cleaned = cleaned.replace(pattern, '')
        }
      })
      
      // Add remix info in brackets if found
      if (remixInfo.trim()) {
        cleaned = `${cleaned.trim()} [${remixInfo.trim()}]`
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
