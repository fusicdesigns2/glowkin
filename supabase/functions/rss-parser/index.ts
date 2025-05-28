
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RSSItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  guid?: string;
  content?: string;
  thumbImageUrl?: string;
  mediaUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { feedId, feedUrl, fieldMappings } = await req.json()

    console.log(`Fetching RSS feed from: ${feedUrl}`)
    
    // Fetch RSS feed
    const response = await fetch(feedUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const rssText = await response.text()
    console.log(`RSS feed fetched, parsing...`)

    // Parse RSS XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(rssText, 'text/xml')
    
    const items = doc.querySelectorAll('item')
    console.log(`Found ${items.length} items in RSS feed`)

    // Get existing GUIDs to avoid duplicates
    const { data: existingItems } = await supabaseClient
      .from('feed_data')
      .select('guid')
      .eq('feed_id', feedId)

    const existingGuids = new Set(existingItems?.map(item => item.guid) || [])

    const newItems: RSSItem[] = []

    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent
      const description = item.querySelector('description')?.textContent
      const link = item.querySelector('link')?.textContent
      const pubDate = item.querySelector('pubDate')?.textContent
      const guid = item.querySelector('guid')?.textContent || link

      // Skip if we already have this item
      if (guid && existingGuids.has(guid)) {
        return
      }

      // Extract custom fields based on field mappings
      let content = ''
      let thumbImageUrl = ''
      let mediaUrl = ''

      if (fieldMappings.pubContent) {
        const contentEl = item.querySelector(fieldMappings.pubContent)
        content = contentEl?.textContent || ''
      }

      if (fieldMappings.pubThumbImage) {
        const thumbEl = item.querySelector(fieldMappings.pubThumbImage)
        thumbImageUrl = thumbEl?.getAttribute('url') || thumbEl?.textContent || ''
      }

      if (fieldMappings.pubMedia) {
        const mediaEl = item.querySelector(fieldMappings.pubMedia)
        mediaUrl = mediaEl?.getAttribute('url') || mediaEl?.textContent || ''
      }

      newItems.push({
        title,
        description,
        link,
        pubDate,
        guid,
        content,
        thumbImageUrl,
        mediaUrl
      })
    })

    console.log(`Processing ${newItems.length} new items`)

    // Insert new items into database
    if (newItems.length > 0) {
      const insertData = newItems.map(item => ({
        feed_id: feedId,
        title: item.title,
        description: item.description,
        link: item.link,
        pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        guid: item.guid,
        content: item.content,
        thumb_image_url: item.thumbImageUrl,
        media_url: item.mediaUrl,
        raw_data: item
      }))

      const { error: insertError } = await supabaseClient
        .from('feed_data')
        .insert(insertData)

      if (insertError) {
        console.error('Error inserting feed data:', insertError)
        throw insertError
      }
    }

    // Update feed last checked timestamp
    const { error: updateError } = await supabaseClient
      .from('feed_details')
      .update({ date_last_checked: new Date().toISOString() })
      .eq('id', feedId)

    if (updateError) {
      console.error('Error updating feed timestamp:', updateError)
      throw updateError
    }

    console.log(`Successfully imported ${newItems.length} new items`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        itemsImported: newItems.length,
        message: `Successfully imported ${newItems.length} new items`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing RSS feed:', error)
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
