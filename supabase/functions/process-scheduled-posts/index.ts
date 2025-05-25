
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all scheduled posts that are due for publishing
    const now = new Date().toISOString();
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('social_posts')
      .select(`
        *,
        facebook_pages!inner(page_id, access_token, page_name)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now);

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledPosts?.length || 0} posts to process`);

    const results = [];

    for (const post of scheduledPosts || []) {
      try {
        console.log(`Processing post ${post.id} for page ${post.facebook_pages.page_name}`);

        // Prepare post data for Facebook API
        const postData: any = {
          message: post.content,
          access_token: post.facebook_pages.access_token
        };

        // Post to Facebook
        const postResponse = await fetch(
          `https://graph.facebook.com/v18.0/${post.facebook_pages.page_id}/feed`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
          }
        );

        const postResult = await postResponse.json();

        if (postResult.error) {
          // Mark as failed
          await supabase
            .from('social_posts')
            .update({
              status: 'failed',
              error_message: postResult.error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.push({
            postId: post.id,
            status: 'failed',
            error: postResult.error.message
          });

          console.error(`Failed to post ${post.id}:`, postResult.error.message);
        } else {
          // Mark as posted
          await supabase
            .from('social_posts')
            .update({
              status: 'posted',
              facebook_post_id: postResult.id,
              posted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.push({
            postId: post.id,
            status: 'posted',
            facebookPostId: postResult.id
          });

          console.log(`Successfully posted ${post.id} as ${postResult.id}`);
        }
      } catch (error) {
        // Mark as failed
        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        results.push({
          postId: post.id,
          status: 'failed',
          error: error.message
        });

        console.error(`Error processing post ${post.id}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Process scheduled posts error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
