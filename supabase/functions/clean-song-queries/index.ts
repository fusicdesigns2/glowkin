
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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const systemPrompt = `You are a music track formatter. Your job is to clean up messy song listings and format them consistently.

Rules:
1. Format as: "Artist – Song Title [Remix Type]" (use en dash –)
2. Remove all extra information like: prices, dates, BPM, keys, labels, catalog numbers, genre info
3. If there's remix information, put it in square brackets [Original Mix], [Extended Mix], [Club Mix], etc.
4. Remove numbering (1., 2., etc.)
5. Clean up capitalization appropriately
6. If artist and title are on separate lines, combine them
7. Remove any extra metadata or formatting

Examples:
Input: "1. Shape of You Ed Sheeran Original Mix $1.49 2017-01-06"
Output: "Ed Sheeran – Shape of You [Original Mix]"

Input: "Blinding Lights\nThe Weeknd\nRadio Edit"
Output: "The Weeknd – Blinding Lights [Radio Edit]"

Clean up each line independently. Return only the cleaned song titles, one per line.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Clean up these song listings:\n\n${queries}` }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const cleanedQueries = data.choices[0].message.content.trim()

    return new Response(JSON.stringify({
      success: true,
      cleanedQueries
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
