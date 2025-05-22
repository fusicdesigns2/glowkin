import { supabase } from '@/integrations/supabase/client';
import { Thread, ChatMessage, KeyInfo } from '@/types/chat';
import { Json } from '@/integrations/supabase/types';

export const loadThreadsFromDB = async (userId: string): Promise<Thread[]> => {
  const { data: threads, error: threadsError } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (threadsError) throw threadsError;

  const loadedThreads = await Promise.all(threads.map(async (thread) => {
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return {
      id: thread.id,
      title: thread.title,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        model: msg.model,
        input_tokens: msg.input_tokens,
        output_tokens: msg.output_tokens,
        tenXCost: msg["10x_cost"],
        summary: msg.summary,
        keyInfo: msg.key_info as unknown as KeyInfo | undefined
      })),
      lastUpdated: new Date(thread.updated_at),
      hidden: thread.hidden,
      system_prompt: thread.system_prompt,
      project_id: thread.project_id
    };
  }));

  return loadedThreads;
};

export const createThread = async (userId: string, title: string = 'New Chat'): Promise<string> => {
  const { data, error } = await supabase
    .from('chat_threads')
    .insert({
      user_id: userId,
      title
    })
    .select()
    .single();

  if (error) throw error;
  
  return data.id;
};

export const saveMessage = async (
  threadId: string,
  role: 'user' | 'assistant',
  content: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  tenXCost: number,
  predictedCost: number,
  summary?: string,
  keyInfo?: KeyInfo | null
) => {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      role,
      content,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      '10x_cost': tenXCost,
      predicted_cost: predictedCost,
      summary,
      key_info: keyInfo as unknown as Json
    });

  if (error) throw error;
  
  // Update the thread's updated_at timestamp
  const { error: updateError } = await supabase
    .from('chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);
  
  if (updateError) throw updateError;
};

export const sendChatMessage = async (
  messages: ChatMessage[],
  isImageRequest: boolean = false,
  model: string = 'gpt-4o'
) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        isImageRequest,
        model
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return `Error: ${errorText}`;
    }
    
    const data = await response.json();
    
    // If this is an image request, return image URL
    if (isImageRequest) {
      if (data.error) {
        return { error: data.error };
      }
      return { 
        url: data.imageUrl,
        model: data.model || 'dall-e-3'
      };
    }
    
    return {
      content: data.content,
      input_tokens: data.input_tokens || 0,
      output_tokens: data.output_tokens || 0,
      model: data.model || model,
      keyInfo: data.keyInfo as KeyInfo | undefined
    };
  } catch (error) {
    console.error('Error sending chat message:', error);
    return `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const summarizeMessage = async (content: string, role: 'user' | 'assistant'): Promise<string> => {
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        role
      }),
    });
    
    if (!response.ok) {
      console.error('Error summarizing message:', await response.text());
      return '';
    }
    
    const data = await response.json();
    return data.summary || '';
  } catch (error) {
    console.error('Error summarizing message:', error);
    return '';
  }
};

export const getMessageCostEstimate = async (message: string, model?: string): Promise<number> => {
  try {
    const response = await fetch('/api/estimate-cost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        model
      }),
    });
    
    if (!response.ok) {
      console.error('Error estimating message cost:', await response.text());
      return 1; // Default to 1 credit as fallback
    }
    
    const data = await response.json();
    return data.estimatedCost || 1;
  } catch (error) {
    console.error('Error estimating message cost:', error);
    return 1; // Default to 1 credit as fallback
  }
};

export const updateThreadContextData = async (threadId: string, contextData: any[]) => {
  const trimmedContextData = contextData.map(item => ({
    id: item.id,
    title: item.title,
    content: item.content
  }));
  
  const { error } = await supabase
    .from('chat_threads')
    .update({
      context_data: trimmedContextData as Json
    })
    .eq('id', threadId);
  
  if (error) throw error;
};

export const calculateTokenCosts = (inputWords: number, outputWords: number, model: string): { inputCost: number, outputCost: number, toFixed: (digits: number) => string } => {
  // Default costs (these should be updated with actual costs per model)
  const costs = {
    'gpt-4o': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.005, output: 0.015 }
  };
  
  const modelCost = costs[model as keyof typeof costs] || costs['gpt-3.5-turbo'];
  
  // Estimate tokens (rough approximation)
  const inputTokens = inputWords * 1.3;
  const outputTokens = outputWords * 1.3;
  
  // Calculate costs (per 1000 tokens)
  const inputCost = (inputTokens / 1000) * modelCost.input;
  const outputCost = (outputTokens / 1000) * modelCost.output;
  
  const total = inputCost + outputCost;
  
  return { 
    inputCost, 
    outputCost,
    toFixed: (digits: number) => total.toFixed(digits)
  };
};

export const getActiveModelCost = async (model: string) => {
  try {
    const { data, error } = await supabase
      .from('model_costs')
      .select('*')
      .eq('model', model)
      .eq('active', true)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No active model cost found');

    return data;
  } catch (error) {
    console.error('Error getting active model cost:', error);
    return null;
  }
};
