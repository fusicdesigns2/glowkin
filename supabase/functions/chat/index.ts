
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages, generateImage, model } = await req.json()
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

        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI Image API error:', JSON.stringify(errorData));
          return new Response(JSON.stringify({ 
            error: errorData.error?.message || 'Error generating image',
            errorCode: errorData.error?.code || 'unknown_error' 
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const imageData = await response.json();
        
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
          model: 'image-alpha-001',
          prompt: userPrompt // Return the original prompt for display
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Define the supported models with exact casing that OpenAI expects
    const SUPPORTED_MODELS = {
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o': 'gpt-4o',
      'gpt-4.5-preview': 'gpt-4.5-preview',
      // Allow for legacy capitalized formats
      'GPT-4o-mini': 'gpt-4o-mini',
      'GPT-4o': 'gpt-4o',
      'GPT-4.5-preview': 'gpt-4.5-preview'
    };

    // Default model if none is specified
    let selectedModel = 'gpt-4o-mini';
    
    // If a model was specified, map it to the proper format
    if (model) {
      const requestedModel = model.toLowerCase();
      
      // Find a match in our supported models (case-insensitive)
      const matchedModel = Object.keys(SUPPORTED_MODELS).find(
        m => m.toLowerCase() === requestedModel
      );
      
      if (matchedModel) {
        selectedModel = SUPPORTED_MODELS[matchedModel];
      } else {
        console.log(`Requested unsupported model: ${model}, using default model: ${selectedModel}`);
      }
    }
    
    console.log('Processing chat request with model:', selectedModel);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
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
      model: selectedModel // Return the model that was actually used
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
