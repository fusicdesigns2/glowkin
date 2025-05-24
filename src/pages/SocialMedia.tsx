
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FacebookPageList } from '@/components/social/FacebookPageList';
import { CreatePost } from '@/components/social/CreatePost';
import { PostHistory } from '@/components/social/PostHistory';
import { FailedPosts } from '@/components/social/FailedPosts';
import { Facebook, Plus } from 'lucide-react';
import Header from '@/components/Header';

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  created_at: string;
}

export default function SocialMedia() {
  const { user } = useAuth();
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pages');

  useEffect(() => {
    if (user) {
      loadFacebookPages();
    }
  }, [user]);

  const loadFacebookPages = async () => {
    try {
      const { data, error } = await supabase
        .from('facebook_pages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFacebookPages(data || []);
    } catch (error) {
      console.error('Error loading Facebook pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookConnect = async () => {
    // This will be implemented with Facebook OAuth flow
    console.log('Starting Facebook OAuth flow...');
    // For now, we'll show a placeholder
    alert('Facebook OAuth integration will be implemented next');
  };

  const canAddMorePages = facebookPages.length < 2; // Basic limit, can be expanded for Pro users

  return (
    <div className="min-h-screen bg-maiBg">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-maiDarkText mb-2">Social Media Management</h1>
          <p className="text-gray-600">Manage your Facebook page connections and create posts from your AI conversations.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pages">Connected Pages</TabsTrigger>
            <TabsTrigger value="create">Create Post</TabsTrigger>
            <TabsTrigger value="history">Post History</TabsTrigger>
            <TabsTrigger value="failed">Failed Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Facebook className="h-5 w-5 text-blue-600" />
                      Facebook Pages
                    </CardTitle>
                    <CardDescription>
                      Connect up to 2 Facebook pages to publish content directly from your chats.
                    </CardDescription>
                  </div>
                  {canAddMorePages && (
                    <Button onClick={handleFacebookConnect} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Connect Facebook Page
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <FacebookPageList 
                  pages={facebookPages} 
                  onRefresh={loadFacebookPages}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <CreatePost facebookPages={facebookPages} />
          </TabsContent>

          <TabsContent value="history">
            <PostHistory />
          </TabsContent>

          <TabsContent value="failed">
            <FailedPosts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
