
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SocialPost {
  id: string;
  content: string;
  status: string;
  scheduled_for: string | null;
  posted_at: string | null;
  facebook_post_id: string | null;
  stats: any;
  created_at: string;
  facebook_pages?: {
    page_name: string;
    page_id: string;
  };
}

export function PostHistory() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          facebook_pages(page_name, page_id)
        `)
        .eq('user_id', user?.id)
        .in('status', ['posted', 'scheduled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load post history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500 mb-4">No posts created yet.</p>
          <p className="text-sm text-gray-400">
            Your scheduled and published posts will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Post History</CardTitle>
        </CardHeader>
      </Card>

      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getStatusColor(post.status)}>
                    {post.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {post.facebook_pages?.page_name}
                  </span>
                </div>
                <p className="text-gray-800 mb-3 line-clamp-3">
                  {post.content}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {post.status === 'scheduled' && post.scheduled_for && (
                    <span>Scheduled: {formatDate(post.scheduled_for)}</span>
                  )}
                  {post.status === 'posted' && post.posted_at && (
                    <span>Posted: {formatDate(post.posted_at)}</span>
                  )}
                </div>
                
                {post.stats && Object.keys(post.stats).length > 0 && (
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>
                      {post.stats.likes || 0} likes, {post.stats.comments || 0} comments
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {post.facebook_post_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://facebook.com/${post.facebook_post_id}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
