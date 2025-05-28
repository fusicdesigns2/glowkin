
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const { rssData } = await req.json()

    if (!rssData) {
      throw new Error('No RSS data provided')
    }

    const systemPrompt = `You are an RSS feed analyzer. Given RSS feed XML data, identify the appropriate field names for these specific data types:

1. pubDate - Publication date/time field
2. pubThumbImage - Thumbnail or preview image field  
3. pubContent - Full content/description field
4. pubMedia - Media content field (video, audio, etc.)

Return ONLY a JSON object with these exact keys and the corresponding XML field names as values. If a field type is not found, use an empty string.

Example response:
{
  "pubDate": "pubDate",
  "pubThumbImage": "media:thumbnail",
  "pubContent": "content:encoded", 
  "pubMedia": "media:content"
}`

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
          { role: 'user', content: `Analyze this RSS data and identify field mappings:\n\n${rssData}` }
        ],
        temperature: 0.1,
        max_tokens: 200
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content.trim()

    console.log('AI Response:', aiResponse)

    // Try to parse the JSON response
    let mapping
    try {
      mapping = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      // Fallback mapping
      mapping = {
        pubDate: "pubDate",
        pubThumbImage: "",
        pubContent: "description",
        pubMedia: ""
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        mapping: mapping
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error analyzing RSS fields:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
