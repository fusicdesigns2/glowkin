
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';

export default function PDFList() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const loadPDFs = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('pdf_uploads')
        .select(`
          id,
          filename,
          file_size,
          status,
          created_at,
          analysis_id,
          pdf_analysis(id, status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPdfs(data || []);
      
    } catch (error) {
      console.error('Error loading PDFs:', error);
      toast({
        title: "Error",
        description: `Failed to load your PDFs: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      loadPDFs();
    }
  }, [user]);

  const getStatusBadge = (pdfItem: any) => {
    let status = 'uploaded';
    let color = 'bg-gray-200 text-gray-800';
    
    if (pdfItem.analysis_id) {
      const analysis = pdfItem.pdf_analysis;
      if (analysis && analysis.length > 0) {
        status = analysis[0].status;
        
        switch (status) {
          case 'pending':
            color = 'bg-blue-100 text-blue-800';
            break;
          case 'processing':
            color = 'bg-yellow-100 text-yellow-800';
            break;
          case 'completed':
            color = 'bg-green-100 text-green-800';
            break;
          case 'failed':
            color = 'bg-red-100 text-red-800';
            break;
          default:
            color = 'bg-gray-200 text-gray-800';
        }
      }
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My PDF Designs</h1>
          <p className="text-gray-600">Manage your uploaded design files</p>
        </div>
        <Button onClick={() => navigate('/pdf-upload')}>
          <Upload className="mr-2 h-4 w-4" />
          Upload PDF
        </Button>
      </div>

      {pdfs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-4">No PDFs Uploaded</h2>
          <p className="text-gray-600 mb-6">
            You haven't uploaded any PDF design files yet. Upload a PDF to get started with content analysis.
          </p>
          <Button onClick={() => navigate('/pdf-upload')}>
            Upload Your First PDF
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pdfs.map((pdf) => (
                <tr key={pdf.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {pdf.filename}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {format(new Date(pdf.created_at), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {(pdf.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(pdf)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate(`/pdf-analysis/${pdf.id}`)}
                    >
                      View Analysis
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
