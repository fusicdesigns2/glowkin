
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { load as loadSpaCy } from "https://deno.land/x/spacy_js@v0.0.5/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to extract key information using spaCy
async function extractKeyInfo(text) {
  try {
    console.log('Loading spaCy model...');
    const nlp = await loadSpaCy("en_core_web_sm");
    console.log('SpaCy model loaded successfully');

    const doc = await nlp(text);
    
    // Extract entities
    const entities = Array.from(doc.ents).map(ent => ({
      text: ent.text,
      label: ent.label,
      start: ent.start,
      end: ent.end
    }));
    
    // Extract noun chunks (important phrases)
    const nounChunks = Array.from(doc.noun_chunks).map(chunk => ({
      text: chunk.text,
      root: chunk.root.text
    }));
    
    // Extract key verbs (actions)
    const keyVerbs = Array.from(doc.tokens)
      .filter(token => token.pos === "VERB")
      .map(token => ({
        text: token.text,
        lemma: token.lemma
      }));
    
    // Extract subject-verb-object relationships
    const svoTriples = [];
    for (const token of doc.tokens) {
      if (token.dep === "nsubj") {
        const subject = token.text;
        const verb = token.head.text;
        
        // Find object related to this verb
        const objectToken = Array.from(doc.tokens).find(t => 
          t.head === token.head && (t.dep === "dobj" || t.dep === "pobj")
        );
        
        if (objectToken) {
          svoTriples.push({
            subject,
            verb,
            object: objectToken.text
          });
        }
      }
    }
    
    // Return structured data
    return {
      entities,
      nounChunks,
      keyVerbs,
      svoTriples,
      extractionTime: new Date().toISOString(),
      processingModel: "en_core_web_sm"
    };
  } catch (error) {
    console.error('Error in spaCy processing:', error);
    return {
      error: `SpaCy processing failed: ${error.message}`,
      extractionTime: new Date().toISOString()
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages, generateImage, model, summarize } = await req.json()
    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ 
        error: 'Configuration error: OpenAI API key not found' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle message summarization request
    if (summarize) {
      console.log('Processing summarization request');
      const { content, role } = summarize;
      
      try {
        const systemMessage = "You are a helpful assistant that specializes in summarizing text, with context, extract important information and capture tone and emotion, add it as One sentance and bullet points.";
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: `Summarize this ${role} message: ${content}` }
            ],
            temperature: 0.5,
            max_tokens: 250,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI Summarization API error:', JSON.stringify(errorData));
          return new Response(JSON.stringify({ 
            error: errorData.error?.message || 'Error summarizing message',
            errorCode: errorData.error?.code || 'summarization_error' 
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const summaryData = await response.json();
        const summary = summaryData.choices[0].message.content;
        console.log('Successfully generated summary');
        
        return new Response(JSON.stringify({
          summary,
          model: "gpt-4o",
          usage: summaryData.usage || { total_tokens: 0 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (summaryError) {
        console.error('Exception in summarization:', summaryError);
        return new Response(JSON.stringify({ 
          error: `Summarization failed: ${summaryError.message}`,
          errorCode: 'summarization_exception' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Extract key information if this is a user message
    let keyInfoExtraction = null;
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        try {
          console.log('Extracting key information from user message');
          keyInfoExtraction = await extractKeyInfo(lastMessage.content);
          console.log('Key information extracted successfully');
        } catch (extractionError) {
          console.error('Error extracting key information:', extractionError);
          // Continue with the request even if extraction fails
        }
      }
    }

    if (generateImage) {
      // Get only the last message for image generation
      const userPrompt = messages[messages.length - 1].content;
      console.log('Generating image with prompt:', userPrompt);
      
      try {
        // Clean and truncate the prompt to avoid issues
        const maxPromptLength = 1000;
        let sanitizedPrompt = userPrompt.trim().slice(0, maxPromptLength);
        
        if (sanitizedPrompt.length < userPrompt.length) {
          console.log(`Original prompt truncated from ${userPrompt.length} to ${sanitizedPrompt.length} characters`);
        }
        
        // Simple prompt enhancement if needed
        if (sanitizedPrompt.length < 10) {
          sanitizedPrompt = `Create an image of ${sanitizedPrompt}`;
        }
        
        console.log('Sending image request with prompt:', sanitizedPrompt);
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: sanitizedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard"
          }),
        });

        // Log the full response for debugging
        console.log('OpenAI Image API status:', response.status);
        const responseBody = await response.text();
        console.log('OpenAI Image API response body:', responseBody);
        
        // Parse the response if possible
        let imageData;
        try {
          imageData = JSON.parse(responseBody);
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          return new Response(JSON.stringify({ 
            error: 'Invalid response format from OpenAI',
            errorCode: 'parse_error',
            rawResponse: responseBody
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (!response.ok) {
          console.error('OpenAI Image API error:', JSON.stringify(imageData));
          return new Response(JSON.stringify({ 
            error: imageData.error?.message || 'Error generating image',
            errorCode: imageData.error?.code || 'unknown_error' 
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (!imageData.data || !imageData.data[0] || !imageData.data[0].url) {
          console.error('Missing image URL in response:', JSON.stringify(imageData));
          return new Response(JSON.stringify({
            error: 'No image URL returned from OpenAI',
            errorCode: 'missing_image_url'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Successfully generated image, returning URL');
        
        return new Response(JSON.stringify({
          url: imageData.data[0].url,
          model: 'dall-e-3',
          prompt: userPrompt, // Return the original prompt for display
          keyInfo: keyInfoExtraction // Include the extracted key information
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (imageError) {
        console.error('Exception in image generation:', imageError);
        return new Response(JSON.stringify({ 
          error: `Image generation failed: ${imageError.message}`,
          errorCode: 'image_generation_exception' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Processing chat request with model:', model);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        temperature: 0.7,
      }),
    })

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', responseData);
      
      if (responseData.error?.code === 'insufficient_quota') {
        return new Response(JSON.stringify({ 
          error: 'OpenAI API quota exceeded. Please try again later or contact support.',
          errorCode: 'insufficient_quota'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: responseData.error?.message || 'Error communicating with OpenAI',
        errorCode: responseData.error?.code || 'unknown_error' 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('OpenAI response received successfully');
    
    return new Response(JSON.stringify({
      ...responseData,
      usage: responseData.usage || { total_tokens: 0 },
      model: model, // Return the model that was actually used
      keyInfo: keyInfoExtraction // Include the extracted key information
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in chat function:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      errorCode: 'server_error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
