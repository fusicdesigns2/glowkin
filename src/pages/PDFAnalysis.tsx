import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader, FileText, Check } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface ContentElement {
  type: string;
  content?: string;
  importance: string;
  items?: string[];
  description?: string;
  notes?: string;
}

interface ContentSection {
  heading: string;
  elements: ContentElement[];
}

interface AnalysisContent {
  title: string;
  sections: ContentSection[];
  notes: string;
}

export default function PDFAnalysis() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [uploadData, setUploadData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string>('pending');
  const [content, setContent] = useState<AnalysisContent | null>(null);
  const [editedNotes, setEditedNotes] = useState<string>('');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!id || !user) return;
    
    try {
      // Fetch the PDF upload record
      const { data: pdfData, error: pdfError } = await supabase
        .from('pdf_uploads')
        .select('*')
        .eq('id', id)
        .single();
      
      if (pdfError) throw pdfError;
      setUploadData(pdfData);
      
      // Check if analysis exists
      if (pdfData.analysis_id) {
        const { data: analysis, error: analysisError } = await supabase
          .from('pdf_analysis')
          .select('*')
          .eq('id', pdfData.analysis_id)
          .single();
        
        if (analysisError) throw analysisError;
        setAnalysisData(analysis);
        setAnalysisStatus(analysis.status);
        
        if (analysis.status === 'completed' && analysis.content) {
          // Safely cast the JSON data to our AnalysisContent type
          try {
            const parsedContent = analysis.content as Record<string, unknown>;
            
            // Validate the structure matches our expected interface
            if (
              typeof parsedContent.title === 'string' &&
              Array.isArray(parsedContent.sections) &&
              (typeof parsedContent.notes === 'string' || parsedContent.notes === undefined)
            ) {
              const typedContent: AnalysisContent = {
                title: parsedContent.title,
                sections: parsedContent.sections as ContentSection[],
                notes: (parsedContent.notes as string) || ''
              };
              
              setContent(typedContent);
              setEditedNotes(typedContent.notes || '');
            } else {
              throw new Error('Invalid content structure');
            }
          } catch (error) {
            console.error('Error parsing analysis content:', error);
            toast({
              title: "Content Error",
              description: "Could not parse analysis content. The format may be invalid.",
              variant: "destructive"
            });
          }
        }
      } else {
        // Start analysis if it doesn't exist
        await startAnalysis(id);
      }
    } catch (error: any) {
      console.error('Error fetching PDF data:', error);
      toast({
        title: "Error",
        description: `Failed to load PDF data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startAnalysis = async (pdfId: string) => {
    try {
      setAnalysisStatus('processing');
      
      // Fixed: Updated API endpoint to correct format
      const response = await fetch('/functions/v1/analyze-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start analysis: ${response.statusText}`);
      }
      
      const result = await response.json();
      toast({
        title: "Analysis started",
        description: "The PDF is being analyzed. This may take a minute.",
      });
      
      // Start polling for updates
      startPolling(result.analysisId);
      
    } catch (error: any) {
      console.error('Error starting analysis:', error);
      setAnalysisStatus('failed');
      toast({
        title: "Analysis failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const startPolling = (analysisId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('pdf_analysis')
          .select('*')
          .eq('id', analysisId)
          .single();
        
        if (error) throw error;
        
        setAnalysisData(data);
        setAnalysisStatus(data.status);
        
        if (data.status === 'completed' && data.content) {
          clearInterval(intervalId);
          
          // Safely cast the JSON data to our AnalysisContent type
          try {
            const parsedContent = data.content as Record<string, unknown>;
            
            // Validate the structure
            if (
              typeof parsedContent.title === 'string' &&
              Array.isArray(parsedContent.sections) &&
              (typeof parsedContent.notes === 'string' || parsedContent.notes === undefined)
            ) {
              const typedContent: AnalysisContent = {
                title: parsedContent.title,
                sections: parsedContent.sections as ContentSection[],
                notes: (parsedContent.notes as string) || ''
              };
              
              setContent(typedContent);
              setEditedNotes(typedContent.notes || '');
              
              toast({
                title: "Analysis complete",
                description: "The PDF analysis has been completed.",
              });
            } else {
              throw new Error('Invalid content structure');
            }
          } catch (error) {
            console.error('Error parsing analysis content:', error);
            toast({
              title: "Content Error",
              description: "Could not parse analysis content properly.",
              variant: "destructive"
            });
            setAnalysisStatus('failed');
          }
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          toast({
            title: "Analysis failed",
            description: "There was an error analyzing the PDF.",
            variant: "destructive",
          });
        }
        
      } catch (error) {
        console.error('Error polling analysis status:', error);
        clearInterval(intervalId);
      }
    }, 3000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Update notes
  const saveNotes = async () => {
    if (!analysisData || !content) return;
    
    try {
      // Update the content with the edited notes
      const updatedContent: AnalysisContent = {
        ...content,
        notes: editedNotes
      };
      
      // Cast to Json type for Supabase
      const jsonContent = updatedContent as unknown as Json;
      
      const { error } = await supabase
        .from('pdf_analysis')
        .update({ content: jsonContent })
        .eq('id', analysisData.id);
      
      if (error) throw error;
      
      setContent(updatedContent);
      toast({
        title: "Notes saved",
        description: "Your notes have been updated.",
      });
      
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: `Failed to save notes: ${error.message}`,
        variant: "destructive",
      });
    }
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
          <h1 className="text-3xl font-bold mb-2">PDF Analysis</h1>
          {uploadData && (
            <p className="text-gray-600">File: {uploadData.filename}</p>
          )}
        </div>
        <Button onClick={() => navigate('/pdf-upload')}>Upload New PDF</Button>
      </div>

      {analysisStatus === 'pending' || analysisStatus === 'processing' ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Loader className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Analyzing PDF</h2>
          <p className="text-gray-600 mb-4">
            Our AI is extracting content from your design. This may take a minute...
          </p>
        </div>
      ) : analysisStatus === 'failed' ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Analysis Failed</h2>
          <p className="text-gray-600 mb-6">
            There was an error analyzing your PDF. Please try again.
          </p>
          <Button onClick={() => startAnalysis(id!)}>Retry Analysis</Button>
        </div>
      ) : content ? (
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{content.title}</h2>
              <div className="flex items-center text-green-600">
                <Check className="mr-2" />
                <span>Analysis Complete</span>
              </div>
            </div>
            
            {content.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-8">
                <h3 className="text-xl font-semibold mb-4 pb-2 border-b">
                  {section.heading}
                </h3>
                
                {section.elements.map((element, elementIndex) => (
                  <div key={elementIndex} className="mb-6">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-gray-700">
                        {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                        {element.importance && (
                          <span 
                            className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              element.importance === 'high' 
                                ? 'bg-red-100 text-red-800' 
                                : element.importance === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {element.importance.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {element.notes && (
                        <div className="text-sm text-gray-500 italic">
                          Note: {element.notes}
                        </div>
                      )}
                    </div>
                    
                    {element.content && (
                      <Textarea 
                        className="mt-2" 
                        defaultValue={element.content}
                        rows={Math.min(5, Math.max(2, Math.ceil(element.content.length / 50)))}
                      />
                    )}
                    
                    {element.description && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p>{element.description}</p>
                      </div>
                    )}
                    
                    {element.items && (
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        {element.items.map((item, itemIndex) => (
                          <li key={itemIndex}>
                            <Textarea 
                              className="my-1" 
                              defaultValue={item}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
            <div className="mt-8">
              <h3 className="font-semibold mb-2">Additional Notes</h3>
              <Textarea 
                className="mb-4"
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={6}
              />
              <Button onClick={saveNotes}>Save Notes</Button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li>Review the extracted content for accuracy.</li>
              <li>Edit any text that needs improvement.</li>
              <li>Add notes for areas that need clarification.</li>
              <li>Share with stakeholders for approval.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Analysis Available</h2>
          <p className="text-gray-600 mb-6">
            There is no analysis data available for this PDF.
          </p>
          <Button onClick={() => startAnalysis(id!)}>Start Analysis</Button>
        </div>
      )}
    </div>
  );
}
