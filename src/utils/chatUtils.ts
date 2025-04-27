
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
      return "I'm sorry, I couldn't generate a response at this time. Please try again later.";
    }

    // Safely extract the message content
    const messageContent = response.data.choices[0]?.message?.content;
    if (!messageContent) {
      console.warn('No message content in the response:', response.data);
      return "I apologize, but I received an empty response. Please try a different question.";
    }

    return messageContent;
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    
    // Return a user-friendly error message
    const errorMessage = error.message || 'Unknown error';
    if (errorMessage.includes('quota')) {
      return `Error: OpenAI API quota exceeded. The AI service is currently unavailable due to quota limitations. Please try again later or contact support.`;
    }
    
    return `Error: ${errorMessage}. Please try again later.`;
  }
};
