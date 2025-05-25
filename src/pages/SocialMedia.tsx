
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
import { toast } from 'sonner';

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  created_at: string;
}

const FACEBOOK_APP_ID = '1234567890123456'; // This will need to be configured
const FACEBOOK_REDIRECT_URI = `${window.location.origin}/social-media`;

export default function SocialMedia() {
  const { user } = useAuth();
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pages');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (user) {
      loadFacebookPages();
    }
  }, [user]);

  useEffect(() => {
    // Handle Facebook OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      toast.error('Facebook authorization was cancelled or failed');
      // Clean up URL
      window.history.replaceState({}, document.title, '/social-media');
      return;
    }

    if (code) {
      handleFacebookCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, '/social-media');
    }
  }, []);

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
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&` +
      `scope=pages_manage_posts,pages_read_engagement,pages_show_list&` +
      `response_type=code`;

    window.location.href = authUrl;
  };

  const handleFacebookCallback = async (code: string) => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: {
          action: 'exchange_code',
          code: code
        }
      });

      if (error) throw error;

      if (data.success) {
        // Show page selection dialog
        showPageSelectionDialog(data.pages, data.userToken);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      toast.error('Failed to connect Facebook account');
    } finally {
      setIsConnecting(false);
    }
  };

  const showPageSelectionDialog = (pages: any[], userToken: string) => {
    // For now, we'll automatically connect the first page
    // In a real implementation, you'd show a dialog for page selection
    if (pages.length > 0) {
      connectPage(pages[0], userToken);
    } else {
      toast.error('No Facebook pages found to connect');
    }
  };

  const connectPage = async (page: any, userToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: {
          action: 'connect_page',
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Successfully connected ${page.name}`);
        loadFacebookPages();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error connecting page:', error);
      toast.error('Failed to connect Facebook page');
    }
  };

  const canAddMorePages = facebookPages.length < 2; // Basic limit, can be expanded for Pro users

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-maiBg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Connecting to Facebook...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
