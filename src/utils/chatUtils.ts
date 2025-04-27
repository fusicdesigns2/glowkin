
import { supabase } from '@/integrations/supabase/client';
import { Thread, ChatMessage, ThreadMessage, ModelCost } from '@/types/chat';

export const getMessageCostEstimate = (content: string): number => {
  const charCount = content.length;
  const creditsPerChar = 0.01; // 1 credit per 100 chars
  return Math.max(1, Math.ceil(charCount * creditsPerChar));
};

export const createThread = async (userId: string, title: string): Promise<string> => {
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
  tenXCost: number = 0
): Promise<void> => {
  if (!threadId || !isValidUUID(threadId)) {
    throw new Error(`Invalid thread ID format: ${threadId}`);
  }

  const activeModelCost = await getActiveModelCost(model);
  const creditCost = activeModelCost ? 
    Math.ceil((inputTokens * activeModelCost.in_cost + outputTokens * activeModelCost.out_cost) * activeModelCost.markup * 100) : 
    0;

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      role,
      content,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      "10x_cost": tenXCost,
      credit_cost: creditCost
    });

  if (error) throw error;
};

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

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
        tenXCost: msg["10x_cost"]
      })),
      lastUpdated: new Date(thread.updated_at)
    };
  }));

  return loadedThreads;
};

export const loadThreadsFromStorage = (userId: string): Thread[] | null => {
  const storedThreads = localStorage.getItem(`maimai_threads_${userId}`);
  if (!storedThreads) return null;

  try {
    return JSON.parse(storedThreads).map((thread: any) => ({
      ...thread,
      lastUpdated: new Date(thread.lastUpdated),
      messages: thread.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }));
  } catch (e) {
    console.error('Failed to parse stored threads:', e);
    return null;
  }
};

export const saveThreadsToStorage = (userId: string, threads: Thread[]): void => {
  localStorage.setItem(`maimai_threads_${userId}`, JSON.stringify(threads));
};

export const sendChatMessage = async (messages: ChatMessage[], generateImage: boolean = false, model: string = 'gpt-4o-mini') => {
  try {
    console.log('Sending chat messages to edge function:', messages, 'using model:', model);
    
    const response = await supabase.functions.invoke('chat', {
      body: {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        generateImage,
        model
      }
    });

    console.log('Edge function response:', response);

    if (response.error) {
      if (response.error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please try again later or add more credits.');
      }
      throw new Error(response.error.message);
    }

    if (response.data?.error) {
      const errorMessage = response.data.error;
      const errorCode = response.data.errorCode;
      
      if (errorCode === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. You may need to add more credits to your account.');
      }
      
      throw new Error(errorMessage || 'Error from OpenAI service');
    }

    if (!response.data) {
      throw new Error('No data received from the chat service');
    }

    if (generateImage) {
      return response.data;
    }

    if (!response.data.choices || !response.data.choices.length) {
      console.warn('No choices returned in the response:', response.data);
      return {
        content: "I'm sorry, I couldn't generate a response at this time. Please try again later.",
        input_tokens: 0,
        output_tokens: 0,
        model: "error"
      };
    }

    const messageContent = response.data.choices[0]?.message?.content;
    const inputTokens = response.data.usage?.prompt_tokens || 0;
    const outputTokens = response.data.usage?.completion_tokens || 0;
    const usedModel = response.data.model || model;

    return {
      content: messageContent,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model: usedModel
    };
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
};

export const getActiveModelCost = async (model: string): Promise<ModelCost | null> => {
  try {
    const { data, error } = await supabase
      .from('model_costs')
      .select('*')
      .eq('model', model)
      .eq('active', true)
      .single();

    if (error) {
      console.error('Error fetching model cost:', error);
      return null;
    }

    return data ? {
      ...data,
      date: new Date(data.date)
    } : null;
  } catch (error) {
    console.error('Error in getActiveModelCost:', error);
    return null;
  }
};

export const calculateTokenCosts = (inputTokens: number, outputTokens: number, modelCost: ModelCost): number => {
  const inputCost = inputTokens * modelCost.in_cost * modelCost.markup;
  const outputCost = outputTokens * modelCost.out_cost * modelCost.markup;
  return inputCost + outputCost;
};
