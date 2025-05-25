
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useFacebookPost() {
  const { user } = useAuth();
  const [isPosting, setIsPosting] = useState(false);

  const postToFacebook = async (
    pageId: string,
    content: string,
    images: string[] = [],
    isScheduled: boolean = false,
    scheduledDate?: string
  ) => {
    setIsPosting(true);
    try {
      // First, save the post to our database
      const postData = {
        user_id: user?.id,
        facebook_page_id: pageId,
        content,
        images,
        status: isScheduled ? 'scheduled' : 'draft',
        scheduled_for: scheduledDate || null
      };

      const { data: savedPost, error: saveError } = await supabase
        .from('social_posts')
        .insert(postData)
        .select()
        .single();

      if (saveError) throw saveError;

      // If posting immediately, call the Facebook API
      if (!isScheduled) {
        const { data, error } = await supabase.functions.invoke('facebook-oauth', {
          body: {
            action: 'post_to_facebook',
            content,
            images,
            pageId
          }
        });

        if (error) {
          // Mark as failed in database
          await supabase
            .from('social_posts')
            .update({
              status: 'failed',
              error_message: error.message
            })
            .eq('id', savedPost.id);
          throw error;
        }

        if (data.success) {
          // Update the post status
          await supabase
            .from('social_posts')
            .update({
              status: 'posted',
              facebook_post_id: data.postId,
              posted_at: new Date().toISOString()
            })
            .eq('id', savedPost.id);

          toast.success('Post published successfully!');
        } else {
          // Mark as failed
          await supabase
            .from('social_posts')
            .update({
              status: 'failed',
              error_message: data.error
            })
            .eq('id', savedPost.id);

          throw new Error(data.error);
        }
      } else {
        toast.success('Post scheduled successfully!');
      }

      return savedPost;
    } catch (error) {
      console.error('Error posting to Facebook:', error);
      toast.error('Failed to post to Facebook');
      throw error;
    } finally {
      setIsPosting(false);
    }
  };

  return {
    postToFacebook,
    isPosting
  };
}
