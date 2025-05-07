
import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageDownloadProps {
  imageUrl: string;
  prompt: string;
}

export default function ImageDownload({ imageUrl, prompt }: ImageDownloadProps) {
  const handleDownload = async () => {
    try {
      // Check if the URL is valid
      if (!imageUrl) {
        toast.error("Invalid image URL");
        return;
      }

      // Create a temporary anchor element
      const downloadLink = document.createElement('a');
      
      // For cross-origin images, we need to fetch and convert to blob
      if (imageUrl.startsWith('http')) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
          }
          
          const blob = await response.blob();
          downloadLink.href = URL.createObjectURL(blob);
        } catch (error) {
          console.error("Error fetching image:", error);
          toast.error("Failed to download image. Please try again.");
          return;
        }
      } else {
        // Direct data URL can be used directly
        downloadLink.href = imageUrl;
      }
      
      // Generate a filename based on the prompt
      const filename = `generated-image-${prompt.slice(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      downloadLink.download = filename;
      
      // Append to the document, click it programmatically, then remove it
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast.success("Image download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-1 mt-2"
    >
      <Download className="h-4 w-4" />
      <span>Download Image</span>
    </Button>
  );
}
