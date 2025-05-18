
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader, FileText, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function PDFUpload() {
  const { user, isLoading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Validate the file is a PDF
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
      const filePath = fileName;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('pdf_designs')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Add record to the pdf_uploads table
      const { data: pdfData, error: dbError } = await supabase
        .from('pdf_uploads')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          status: 'uploaded'
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "PDF uploaded successfully",
        description: "You will be redirected to the analysis page.",
      });

      // Navigate to the PDF analysis page
      setTimeout(() => {
        navigate(`/pdf-analysis/${pdfData.id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Upload failed",
        description: `Error: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Content Gather</h1>
        <p className="text-gray-600">Upload your PDF design files for AI analysis</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload PDF</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/pdf"
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <FileText className="h-16 w-16 text-blue-500 mb-4" />
              <p className="text-lg font-medium mb-1">{file.name}</p>
              <p className="text-sm text-gray-500 mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <Button onClick={() => setFile(null)} variant="outline">
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Drag and drop your PDF here</p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <Button onClick={triggerFileInput}>Select PDF</Button>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="min-w-[120px]"
          >
            {uploading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" /> 
                Uploading...
              </>
            ) : (
              'Upload & Analyze'
            )}
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>Upload your PDF design file.</li>
          <li>Our AI will analyze the content requirements from your design.</li>
          <li>Review and edit the extracted content.</li>
          <li>Share with stakeholders for approval.</li>
        </ol>
      </div>
    </div>
  );
}
