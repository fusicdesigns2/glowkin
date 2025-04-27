
import { Thread, ChatMessage, ThreadMessage } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';

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
  tokensUsed: number
): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      role,
      content,
      model,
      tokens_used: tokensUsed
    });

  if (error) throw error;
};

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
        role: msg.role as 'user' | 'assistant', // Type assertion to ensure compatibility
        content: msg.content,
        timestamp: new Date(msg.created_at),
        model: msg.model,
        tokens_used: msg.tokens_used
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

export const sendChatMessage = async (messages: ChatMessage[], threadId?: string) => {
  try {
    console.log('Sending chat messages to edge function:', messages);
    
    const response = await supabase.functions.invoke('chat', {
      body: {
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ]
      }
    });

    console.log('Edge function response:', response);

    // Handle specific error cases
    if (response.error) {
      if (response.error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please try again later or add more credits.');
      }
      throw new Error(response.error.message);
    }

    // Handle error in response data
    if (response.data?.error) {
      const errorMessage = response.data.error;
      const errorCode = response.data.errorCode;
      
      if (errorCode === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. You may need to add more credits to your account.');
      }
      
      throw new Error(errorMessage || 'Error from OpenAI service');
    }

    // Make sure we have valid response data
    if (!response.data) {
      throw new Error('No data received from the chat service');
    }

    // Validate that we have what we need in the data structure
    if (!response.data.choices || !response.data.choices.length) {
      console.warn('No choices returned in the response:', response.data);
      return {
        content: "I'm sorry, I couldn't generate a response at this time. Please try again later.",
        tokensUsed: 0,
        model: "error"
      };
    }

    // Safely extract the message content
    const messageContent = response.data.choices[0]?.message?.content;
    const tokensUsed = response.data.usage?.total_tokens || 0;
    const model = response.data.model || 'gpt-4o-mini';

    return {
      content: messageContent,
      tokensUsed,
      model
    };
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
};
