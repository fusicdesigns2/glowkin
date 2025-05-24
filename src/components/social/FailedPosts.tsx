
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FailedPost {
  id: string;
  content: string;
  error_message: string | null;
  created_at: string;
  facebook_pages?: {
    page_name: string;
  };
}

export function FailedPosts() {
  const { user } = useAuth();
  const [failedPosts, setFailedPosts] = useState<FailedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadFailedPosts();
    }
  }, [user]);

  const loadFailedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          facebook_pages(page_name)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFailedPosts(data || []);
    } catch (error) {
      console.error('Error loading failed posts:', error);
      toast.error('Failed to load failed posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (postId: string) => {
    setRetryingIds(prev => new Set(prev).add(postId));
    
    try {
      // For now, just reset status to draft
      // In production, this would trigger the Facebook posting process
      const { error } = await supabase
        .from('social_posts')
        .update({ 
          status: 'draft',
          error_message: null 
        })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post moved to draft. Facebook posting will be available soon.');
      loadFailedPosts();
    } catch (error) {
      console.error('Error retrying post:', error);
      toast.error('Failed to retry post');
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this failed post?')) return;

    try {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Failed post deleted');
      loadFailedPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (failedPosts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No failed posts!</p>
          <p className="text-sm text-gray-400">
            Your posts are publishing successfully.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Failed Posts ({failedPosts.length})
          </CardTitle>
        </CardHeader>
      </Card>

      {failedPosts.map((post) => (
        <Card key={post.id} className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">Failed</Badge>
                  <span className="text-sm text-gray-500">
                    {post.facebook_pages?.page_name}
                  </span>
                </div>
                <p className="text-gray-800 mb-3 line-clamp-3">
                  {post.content}
                </p>
                {post.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                    <p className="text-sm text-red-700">
                      <strong>Error:</strong> {post.error_message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Failed on {new Date(post.created_at).toLocaleString()}
              </span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetry(post.id)}
                  disabled={retryingIds.has(post.id)}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${retryingIds.has(post.id) ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(post.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
