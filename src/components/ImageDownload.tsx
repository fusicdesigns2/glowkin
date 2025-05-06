
import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageDownloadProps {
  imageUrl: string;
  prompt: string;
}

export default function ImageDownload({ imageUrl, prompt }: ImageDownloadProps) {
  const handleDownload = () => {
    // Create a temporary anchor element
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    
    // Generate a filename based on the prompt
    const filename = `generated-image-${prompt.slice(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    downloadLink.download = filename;
    
    // Append to the document, click it programmatically, then remove it
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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
