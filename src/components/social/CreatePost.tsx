
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Send, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
}

interface CreatePostProps {
  facebookPages: FacebookPage[];
}

export function CreatePost({ facebookPages }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postType, setPostType] = useState<'immediate' | 'scheduled'>('immediate');

  const activeFacebookPages = facebookPages.filter(page => page.is_active);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validImages = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image format`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validImages].slice(0, 5)); // Max 5 images
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }

    if (!selectedPageId) {
      toast.error('Please select a Facebook page');
      return;
    }

    if (postType === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      toast.error('Please select a date and time for scheduling');
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduledFor = postType === 'scheduled' 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      // For now, we'll save the post as draft/scheduled
      // The actual Facebook posting will be implemented with edge functions
      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          user_id: user?.id,
          facebook_page_id: selectedPageId,
          content: content.trim(),
          images: images.map(img => ({ name: img.name, size: img.size })),
          scheduled_for: scheduledFor,
          status: postType === 'immediate' ? 'draft' : 'scheduled'
        });

      if (error) throw error;

      toast.success(
        postType === 'immediate' 
          ? 'Post saved! Facebook publishing will be available soon.' 
          : 'Post scheduled successfully!'
      );

      // Reset form
      setContent('');
      setSelectedPageId('');
      setScheduledDate('');
      setScheduledTime('');
      setImages([]);
      setPostType('immediate');

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDateTime = new Date().toISOString().slice(0, 16);

  if (activeFacebookPages.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500 mb-4">No active Facebook pages available.</p>
          <p className="text-sm text-gray-400">
            Please connect a Facebook page first to create posts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Social Media Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="page-select">Select Facebook Page</Label>
            <Select value={selectedPageId} onValueChange={setSelectedPageId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a Facebook page" />
              </SelectTrigger>
              <SelectContent>
                {activeFacebookPages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.page_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content">Post Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to share with your audience?"
              className="min-h-32"
              maxLength={2000}
            />
            <p className="text-sm text-gray-500 mt-1">
              {content.length}/2000 characters
            </p>
          </div>

          <div>
            <Label>Images (Optional)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Upload ${index + 1}`}
                    className="w-20 h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <Label
              htmlFor="image-upload"
              className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400"
            >
              <ImageIcon className="w-6 h-6 mr-2 text-gray-400" />
              Add Images (Max 5, 10MB each)
            </Label>
          </div>

          <div className="space-y-4">
            <Label>Publishing Options</Label>
            <div className="flex space-x-4">
              <Button
                type="button"
                variant={postType === 'immediate' ? 'default' : 'outline'}
                onClick={() => setPostType('immediate')}
                className="flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Post Now
              </Button>
              <Button
                type="button"
                variant={postType === 'scheduled' ? 'default' : 'outline'}
                onClick={() => setPostType('scheduled')}
                className="flex items-center"
              >
                <Clock className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </div>

            {postType === 'scheduled' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !content.trim() || !selectedPageId}
            className="w-full"
          >
            {isSubmitting ? 'Creating...' : 
             postType === 'immediate' ? 'Create Post' : 'Schedule Post'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
