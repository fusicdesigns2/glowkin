
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2 } from 'lucide-react';

interface FieldMapping {
  pubDate: string;
  pubThumbImage: string;
  pubContent: string;
  pubMedia: string;
}

interface RSSFieldMapperProps {
  onMappingGenerated: (mapping: FieldMapping) => void;
}

export function RSSFieldMapper({ onMappingGenerated }: RSSFieldMapperProps) {
  const [rssData, setRssData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeRSSData = async () => {
    if (!rssData.trim()) {
      toast({
        title: "Error",
        description: "Please paste some RSS feed data first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/supabase/functions/v1/analyze-rss-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rssData: rssData.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze RSS data');
      }

      const result = await response.json();
      
      if (result.mapping) {
        onMappingGenerated(result.mapping);
        toast({
          title: "Success",
          description: "Field mapping generated successfully!",
        });
      } else {
        throw new Error('No mapping returned from analysis');
      }
    } catch (error) {
      console.error('Error analyzing RSS data:', error);
      toast({
        title: "Error",
        description: `Failed to analyze RSS data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          AI Field Mapper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="rss-data">Paste RSS Feed Data</Label>
          <Textarea
            id="rss-data"
            placeholder="Paste a sample RSS item here (XML format) and AI will suggest field mappings..."
            value={rssData}
            onChange={(e) => setRssData(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>
        <Button 
          onClick={analyzeRSSData}
          disabled={isAnalyzing || !rssData.trim()}
          className="w-full"
        >
          {isAnalyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Analyze & Generate Field Mapping
        </Button>
      </CardContent>
    </Card>
  );
}
