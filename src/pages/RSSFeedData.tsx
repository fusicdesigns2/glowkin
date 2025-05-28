
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedData {
  id: string;
  title: string | null;
  description: string | null;
  link: string | null;
  pub_date: string | null;
  content: string | null;
  thumb_image_url: string | null;
  media_url: string | null;
  created_at: string;
  feed_details: {
    name: string;
  };
}

interface FeedDetail {
  id: string;
  name: string;
}

export default function RSSFeedData() {
  const { user } = useAuth();
  const [selectedFeedId, setSelectedFeedId] = useState<string>('all');

  const { data: feeds } = useQuery({
    queryKey: ['feeds', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('feed_details')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data as FeedDetail[];
    },
    enabled: !!user
  });

  const { data: feedData, isLoading } = useQuery({
    queryKey: ['feed-data', user?.id, selectedFeedId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('feed_data')
        .select(`
          *,
          feed_details!inner(name, user_id)
        `)
        .eq('feed_details.user_id', user.id)
        .order('pub_date', { ascending: false, nullsLast: true });

      if (selectedFeedId !== 'all') {
        query = query.eq('feed_id', selectedFeedId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as FeedData[];
    },
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to view RSS feed data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">RSS Feed Data</h1>
        <div className="flex items-center space-x-4">
          <Select value={selectedFeedId} onValueChange={setSelectedFeedId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a feed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Feeds</SelectItem>
              {feeds?.map((feed) => (
                <SelectItem key={feed.id} value={feed.id}>
                  {feed.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feed Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : feedData && feedData.length > 0 ? (
            <div className="space-y-4">
              {feedData.map((item) => (
                <Card key={item.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {item.title || 'Untitled'}
                        </h3>
                        <Badge variant="outline" className="mb-2">
                          {item.feed_details.name}
                        </Badge>
                      </div>
                      {item.link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(item.link!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        {item.description && (
                          <div className="mb-2">
                            <p className="text-sm text-muted-foreground mb-1">Description:</p>
                            <p className="text-sm">{item.description}</p>
                          </div>
                        )}
                        
                        {item.content && (
                          <div className="mb-2">
                            <p className="text-sm text-muted-foreground mb-1">Content:</p>
                            <p className="text-sm line-clamp-3">{item.content}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Published: {item.pub_date ? new Date(item.pub_date).toLocaleString() : 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Imported: {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {item.thumb_image_url && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Thumbnail:</p>
                            <img
                              src={item.thumb_image_url}
                              alt="Thumbnail"
                              className="w-24 h-24 object-cover rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {item.media_url && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Media:</p>
                            <a
                              href={item.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Media
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">
                {selectedFeedId === 'all' 
                  ? 'No feed data found. Import some RSS feeds first!'
                  : 'No data found for the selected feed.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
