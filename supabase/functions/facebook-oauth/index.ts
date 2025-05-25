
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
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { action, code, pageAccessToken, pageId, pageName } = await req.json();

    if (action === 'exchange_code') {
      // Exchange Facebook authorization code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${Deno.env.get('FACEBOOK_APP_ID')}&` +
        `client_secret=${Deno.env.get('FACEBOOK_APP_SECRET')}&` +
        `code=${code}&` +
        `redirect_uri=${Deno.env.get('FACEBOOK_REDIRECT_URI')}`
      );

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error.message);
      }

      // Get user's pages
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
      );

      const pagesData = await pagesResponse.json();

      return new Response(JSON.stringify({
        success: true,
        userToken: tokenData.access_token,
        pages: pagesData.data || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'connect_page') {
      // Check if user already has 2 pages connected (basic limit)
      const { data: existingPages, error: countError } = await supabase
        .from('facebook_pages')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (countError) {
        throw new Error('Failed to check existing pages');
      }

      if (existingPages && existingPages.length >= 2) {
        throw new Error('Maximum of 2 Facebook pages allowed');
      }

      // Store the page connection
      const { data, error } = await supabase
        .from('facebook_pages')
        .insert({
          user_id: user.id,
          page_id: pageId,
          page_name: pageName,
          access_token: pageAccessToken,
          token_expires_at: null, // Page tokens don't expire unless user changes password
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to connect page: ${error.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        page: data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'post_to_facebook') {
      const { content, images, pageId } = await req.json();

      // Get the page access token
      const { data: pageData, error: pageError } = await supabase
        .from('facebook_pages')
        .select('access_token, page_id')
        .eq('id', pageId)
        .eq('user_id', user.id)
        .single();

      if (pageError || !pageData) {
        throw new Error('Page not found or not authorized');
      }

      // Post to Facebook
      const postData: any = {
        message: content,
        access_token: pageData.access_token
      };

      // Handle image uploads if present
      if (images && images.length > 0) {
        // For now, we'll just post text. Image upload requires additional handling
        console.log('Image posting not yet implemented');
      }

      const postResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageData.page_id}/feed`,
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
        throw new Error(postResult.error.message);
      }

      return new Response(JSON.stringify({
        success: true,
        postId: postResult.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
