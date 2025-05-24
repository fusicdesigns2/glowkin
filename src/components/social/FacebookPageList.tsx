
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  created_at: string;
}

interface FacebookPageListProps {
  pages: FacebookPage[];
  onRefresh: () => void;
  isLoading: boolean;
}

export function FacebookPageList({ pages, onRefresh, isLoading }: FacebookPageListProps) {
  const handleDisconnect = async (pageId: string, pageName: string) => {
    if (!confirm(`Are you sure you want to disconnect "${pageName}"?`)) return;

    try {
      const { error } = await supabase
        .from('facebook_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      toast.success('Facebook page disconnected successfully');
      onRefresh();
    } catch (error) {
      console.error('Error disconnecting Facebook page:', error);
      toast.error('Failed to disconnect Facebook page');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No Facebook pages connected yet.</p>
        <p className="text-sm text-gray-400">
          Click "Connect Facebook Page" to get started with social media publishing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pages.map((page) => (
        <Card key={page.id} className="border-l-4 border-l-blue-600">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{page.page_name}</h3>
                <p className="text-sm text-gray-500">Page ID: {page.page_id}</p>
                <p className="text-xs text-gray-400">
                  Connected on {new Date(page.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={page.is_active ? "default" : "secondary"}>
                {page.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://facebook.com/${page.page_id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(page.id, page.page_name)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {pages.length >= 2 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            You've reached the maximum of 2 connected Facebook pages.
          </p>
          <p className="text-xs text-gray-400">
            Upgrade to Pro to connect more pages.
          </p>
        </div>
      )}
    </div>
  );
}
