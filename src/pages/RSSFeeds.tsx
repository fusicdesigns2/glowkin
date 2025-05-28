
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, RefreshCw, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface FeedDetail {
  id: string;
  name: string;
  feed_url: string;
  date_last_checked: string | null;
  active: boolean;
  pub_date: string | null;
  pub_thumb_image: string | null;
  pub_content: string | null;
  pub_media: string | null;
  created_at: string;
}

export default function RSSFeeds() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedDetail | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    feed_url: '',
    pub_date: '',
    pub_thumb_image: '',
    pub_content: '',
    pub_media: ''
  });

  const { data: feeds, isLoading } = useQuery({
    queryKey: ['feeds', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('feed_details')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FeedDetail[];
    },
    enabled: !!user
  });

  const createFeedMutation = useMutation({
    mutationFn: async (feedData: typeof formData) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('feed_details')
        .insert({
          user_id: user.id,
          name: feedData.name,
          feed_url: feedData.feed_url,
          pub_date: feedData.pub_date || null,
          pub_thumb_image: feedData.pub_thumb_image || null,
          pub_content: feedData.pub_content || null,
          pub_media: feedData.pub_media || null,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        feed_url: '',
        pub_date: '',
        pub_thumb_image: '',
        pub_content: '',
        pub_media: ''
      });
      toast({
        title: "Success",
        description: "RSS feed added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add RSS feed: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const updateFeedMutation = useMutation({
    mutationFn: async ({ id, feedData }: { id: string; feedData: typeof formData }) => {
      const { data, error } = await supabase
        .from('feed_details')
        .update({
          name: feedData.name,
          feed_url: feedData.feed_url,
          pub_date: feedData.pub_date || null,
          pub_thumb_image: feedData.pub_thumb_image || null,
          pub_content: feedData.pub_content || null,
          pub_media: feedData.pub_media || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      setIsDialogOpen(false);
      setEditingFeed(null);
      setFormData({
        name: '',
        feed_url: '',
        pub_date: '',
        pub_thumb_image: '',
        pub_content: '',
        pub_media: ''
      });
      toast({
        title: "Success",
        description: "RSS feed updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update RSS feed: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('feed_details')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    }
  });

  const deleteFeedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feed_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      toast({
        title: "Success",
        description: "RSS feed deleted successfully",
      });
    }
  });

  const importFeedMutation = useMutation({
    mutationFn: async (feed: FeedDetail) => {
      const fieldMappings = {
        pubDate: feed.pub_date,
        pubThumbImage: feed.pub_thumb_image,
        pubContent: feed.pub_content,
        pubMedia: feed.pub_media
      };

      const response = await fetch('/supabase/functions/v1/rss-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
        },
        body: JSON.stringify({
          feedId: feed.id,
          feedUrl: feed.feed_url,
          fieldMappings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to import RSS feed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      toast({
        title: "Success",
        description: data.message || "RSS feed imported successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to import RSS feed: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFeed) {
      updateFeedMutation.mutate({ id: editingFeed.id, feedData: formData });
    } else {
      createFeedMutation.mutate(formData);
    }
  };

  const handleEdit = (feed: FeedDetail) => {
    setEditingFeed(feed);
    setFormData({
      name: feed.name,
      feed_url: feed.feed_url,
      pub_date: feed.pub_date || '',
      pub_thumb_image: feed.pub_thumb_image || '',
      pub_content: feed.pub_content || '',
      pub_media: feed.pub_media || ''
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFeed(null);
    setFormData({
      name: '',
      feed_url: '',
      pub_date: '',
      pub_thumb_image: '',
      pub_content: '',
      pub_media: ''
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to manage RSS feeds.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">RSS Feeds</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add RSS Feed
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFeed ? 'Edit RSS Feed' : 'Add RSS Feed'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Feed Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="feed_url">Feed URL</Label>
                <Input
                  id="feed_url"
                  type="url"
                  value={formData.feed_url}
                  onChange={(e) => setFormData({ ...formData, feed_url: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pub_date">Publication Date Field</Label>
                <Input
                  id="pub_date"
                  value={formData.pub_date}
                  onChange={(e) => setFormData({ ...formData, pub_date: e.target.value })}
                  placeholder="e.g., pubDate"
                />
              </div>
              <div>
                <Label htmlFor="pub_thumb_image">Thumbnail Image Field</Label>
                <Input
                  id="pub_thumb_image"
                  value={formData.pub_thumb_image}
                  onChange={(e) => setFormData({ ...formData, pub_thumb_image: e.target.value })}
                  placeholder="e.g., media:thumbnail"
                />
              </div>
              <div>
                <Label htmlFor="pub_content">Content Field</Label>
                <Input
                  id="pub_content"
                  value={formData.pub_content}
                  onChange={(e) => setFormData({ ...formData, pub_content: e.target.value })}
                  placeholder="e.g., content:encoded"
                />
              </div>
              <div>
                <Label htmlFor="pub_media">Media Field</Label>
                <Input
                  id="pub_media"
                  value={formData.pub_media}
                  onChange={(e) => setFormData({ ...formData, pub_media: e.target.value })}
                  placeholder="e.g., media:content"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFeedMutation.isPending || updateFeedMutation.isPending}
                >
                  {(createFeedMutation.isPending || updateFeedMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingFeed ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your RSS Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : feeds && feeds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeds.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell className="font-medium">{feed.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      <a 
                        href={feed.feed_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {feed.feed_url}
                      </a>
                    </TableCell>
                    <TableCell>
                      {feed.date_last_checked 
                        ? new Date(feed.date_last_checked).toLocaleString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={feed.active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: feed.id, active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => importFeedMutation.mutate(feed)}
                          disabled={importFeedMutation.isPending}
                        >
                          {importFeedMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(feed)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteFeedMutation.mutate(feed.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No RSS feeds found. Add your first feed!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
