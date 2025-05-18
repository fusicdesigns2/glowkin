
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

Deno.serve(async (req) => {
  try {
    const { pdfId } = await req.json();
    
    if (!pdfId) {
      return new Response(
        JSON.stringify({ error: 'PDF ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for administrative actions
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Fetch PDF details
    const { data: pdfData, error: pdfError } = await supabaseAdmin
      .from('pdf_uploads')
      .select('*, pdf_analysis(*)')
      .eq('id', pdfId)
      .single();
    
    if (pdfError || !pdfData) {
      return new Response(
        JSON.stringify({ error: 'PDF not found', details: pdfError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the system prompt
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('system_prompts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (promptError || !promptData) {
      return new Response(
        JSON.stringify({ error: 'No system prompt found', details: promptError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Download the PDF file
    const { data: fileData, error: fileError } = await supabaseAdmin
      .storage
      .from('pdf_designs')
      .download(pdfData.file_path);
    
    if (fileError || !fileData) {
      return new Response(
        JSON.stringify({ error: 'Failed to download PDF', details: fileError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update analysis status
    let analysisId = pdfData.analysis_id;
    if (!analysisId) {
      // Create new analysis record if it doesn't exist
      const { data: newAnalysis, error: analysisError } = await supabaseAdmin
        .from('pdf_analysis')
        .insert({
          pdf_id: pdfId,
          user_id: pdfData.user_id,
          system_prompt_id: promptData.id,
          status: 'processing'
        })
        .select()
        .single();
      
      if (analysisError || !newAnalysis) {
        return new Response(
          JSON.stringify({ error: 'Failed to create analysis record', details: analysisError }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      analysisId = newAnalysis.id;
      
      // Update the PDF record with the analysis ID
      await supabaseAdmin
        .from('pdf_uploads')
        .update({ analysis_id: analysisId })
        .eq('id', pdfId);
    } else {
      // Update existing analysis status
      await supabaseAdmin
        .from('pdf_analysis')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', analysisId);
    }

    // Start PDF analysis in the background
    EdgeRuntime.waitUntil(analyzePDF(pdfId, analysisId, promptData.prompt, supabaseAdmin));
    
    return new Response(
      JSON.stringify({ 
        message: 'PDF analysis started',
        analysisId: analysisId
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzePDF(pdfId: string, analysisId: string, systemPrompt: string, supabase: any) {
  try {
    // In a production environment, this would use a PDF parsing library
    // and the OpenAI API to analyze the PDF content with a proper tokenization strategy
    
    // For now, we'll simulate the analysis with a delayed response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Example analysis result
    const analysisResults = {
      title: "Website Content Analysis",
      sections: [
        {
          heading: "Home Page",
          elements: [
            { type: "heading", content: "Welcome to Our Service", importance: "high" },
            { type: "paragraph", content: "We provide innovative solutions for your business needs.", importance: "medium" },
            { type: "call-to-action", content: "Get Started Today", importance: "high" }
          ]
        },
        {
          heading: "About Us",
          elements: [
            { type: "heading", content: "Our Story", importance: "medium" },
            { type: "paragraph", content: "Founded in 2023, we have been dedicated to excellence.", importance: "medium" },
            { type: "image", description: "Team photo", importance: "low", notes: "Need high-resolution image" }
          ]
        },
        {
          heading: "Services",
          elements: [
            { type: "heading", content: "What We Offer", importance: "high" },
            { type: "list", items: ["Consulting", "Development", "Support"], importance: "high" },
            { type: "paragraph", content: "Each service is customized to your specific needs.", importance: "medium" }
          ]
        }
      ],
      notes: "Overall, the design requires approximately 500-700 words of content. Several sections need clarification on exact wording for calls-to-action."
    };
    
    // Update the analysis with the results
    const { error } = await supabase
      .from('pdf_analysis')
      .update({
        content: analysisResults,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);
    
    if (error) {
      console.error('Failed to update analysis record:', error);
      
      // Update with error status
      await supabase
        .from('pdf_analysis')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);
    }
    
  } catch (error) {
    console.error('Error during PDF analysis:', error);
    
    // Update with error status
    await supabase
      .from('pdf_analysis')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);
  }
}
