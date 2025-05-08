import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

// Using native NLP functionality instead of spaCy which isn't available
async function extractKeyInfo(text) {
  try {
    console.log('Extracting key information from text...');
    
    // Simple entity extraction using regex patterns
    const entities = [];
    
    // Extract email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      entities.push({
        text: email,
        label: 'EMAIL',
        start: text.indexOf(email),
        end: text.indexOf(email) + email.length
      });
    });
    
    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
      entities.push({
        text: url,
        label: 'URL',
        start: text.indexOf(url),
        end: text.indexOf(url) + url.length
      });
    });
    
    // Extract dates (simple pattern)
    const dateRegex = /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/g;
    const dates = text.match(dateRegex) || [];
    dates.forEach(date => {
      entities.push({
        text: date,
        label: 'DATE',
        start: text.indexOf(date),
        end: text.indexOf(date) + date.length
      });
    });
    
    // Extract potential names (capitalized words not at the start of sentences)
    const nameRegex = /(?<![.!?]\s)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    const names = text.match(nameRegex) || [];
    const commonWords = ['I', 'A', 'The', 'This', 'That', 'It', 'You', 'We', 'They'];
    names
      .filter(name => !commonWords.includes(name))
      .forEach(name => {
        entities.push({
          text: name,
          label: 'POTENTIAL_NAME',
          start: text.indexOf(name),
          end: text.indexOf(name) + name.length
        });
      });
    
    // Extract noun chunks (simplified approach)
    const words = text.split(/\s+/);
    const nounChunks = [];
    
    // Simplistic noun chunking based on capitalized words and their neighboring words
    for (let i = 0; i < words.length; i++) {
      if (/^[A-Z][a-z]+$/.test(words[i]) && !commonWords.includes(words[i])) {
        let chunk = words[i];
        let root = words[i];
        
        // Look ahead for potential multi-word phrases
        if (i < words.length - 1 && !/^[A-Z]/.test(words[i + 1])) {
          chunk += ' ' + words[i + 1];
        }
        
        nounChunks.push({
          text: chunk,
          root: root
        });
      }
    }
    
    // Extract key verbs (simplified)
    const commonVerbs = ['is', 'are', 'was', 'were', 'be', 'being', 'been', 'have', 'has', 'had', 
      'do', 'does', 'did', 'will', 'shall', 'should', 'would', 'can', 'could', 'may', 'might', 'must'];
    
    const verbRegex = /\b(ask|tell|want|need|create|update|delete|remove|add|change|help|make|find|search|get|build|run)\b/gi;
    const verbMatches = [...text.matchAll(verbRegex)];
    
    const keyVerbs = verbMatches.map(match => ({
      text: match[0],
      lemma: match[0].toLowerCase()
    }));
    
    // Basic subject-verb-object extraction
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const svoTriples = [];
    
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/);
      const verbIndices = words.findIndex(word => 
        verbRegex.test(word.toLowerCase()) && !commonVerbs.includes(word.toLowerCase())
      );
      
      if (verbIndices !== -1 && verbIndices > 0 && verbIndices < words.length - 1) {
        svoTriples.push({
          subject: words.slice(0, verbIndices).join(' '),
          verb: words[verbIndices],
          object: words.slice(verbIndices + 1).join(' ')
        });
      }
    });
    
    // Return structured data
    return {
      entities,
      nounChunks,
      keyVerbs,
      svoTriples,
      extractionTime: new Date().toISOString(),
      processingModel: "custom-rule-based"
    };
  } catch (error) {
    console.error('Error in text processing:', error);
    return {
      error: `Text processing failed: ${error.message}`,
      extractionTime: new Date().toISOString(),
      processingModel: "custom-rule-based",
      entities: [],
      nounChunks: [],
      keyVerbs: [],
      svoTriples: []
    };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
          keyInfoExtraction = {
            error: `Text processing failed: ${extractionError.message}`,
            extractionTime: new Date().toISOString(),
            processingModel: "custom-rule-based",
            entities: [],
            nounChunks: [],
            keyVerbs: [],
            svoTriples: []
          };
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
