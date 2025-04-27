
import { Thread, ChatMessage } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';

export const getMessageCostEstimate = (content: string): number => {
  const charCount = content.length;
  const creditsPerChar = 0.01; // 1 credit per 100 chars
  return Math.max(1, Math.ceil(charCount * creditsPerChar));
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

export const sendChatMessage = async (messages: ChatMessage[]) => {
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

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Check if the expected data structure exists
    if (!response.data) {
      throw new Error('No data received from the chat service');
    }

    // Check if we got an error message in the response data
    if (response.data.error) {
      throw new Error(response.data.error.message || 'Error from OpenAI service');
    }

    // Handle the case where choices might not exist or be empty
    if (!response.data.choices || !response.data.choices.length) {
      console.warn('No choices returned in the response:', response.data);
      return "I'm sorry, I couldn't generate a response at this time. Please try again later.";
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    return `Error: ${error.message}. Please try again later.`;
  }
};
