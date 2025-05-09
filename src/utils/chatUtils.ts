
import { supabase } from '@/integrations/supabase/client';
import { Thread, ChatMessage, ThreadMessage, ModelCost, KeyInfo, JsonValue } from '@/types/chat';

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
      title,
      context_data: [] // Initialize empty array for context data
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
  tenXCost: number = 0,
  predictedCost: number | null = null,
  summary: string | null = null,
  keyInfo: KeyInfo | null = null
): Promise<void> => {
  if (!threadId || !isValidUUID(threadId)) {
    throw new Error(`Invalid thread ID format: ${threadId}`);
  }

  const activeModelCost = await getActiveModelCost(model);
  const creditCost = activeModelCost ? 
    Math.ceil((inputTokens * activeModelCost.in_cost + outputTokens * activeModelCost.out_cost) * activeModelCost.markup * 100) : 
    0;

  console.log('Saving message with keyInfo:', keyInfo ? JSON.stringify(keyInfo) : 'null');

  // Validate keyInfo structure before saving
  if (keyInfo) {
    // Ensure all required fields exist
    if (!keyInfo.entities) keyInfo.entities = [];
    if (!keyInfo.nounChunks) keyInfo.nounChunks = [];
    if (!keyInfo.keyVerbs) keyInfo.keyVerbs = [];
    if (!keyInfo.svoTriples) keyInfo.svoTriples = [];
    if (!keyInfo.extractionTime) keyInfo.extractionTime = new Date().toISOString();
    if (!keyInfo.processingModel) keyInfo.processingModel = "unknown";
  }

  // Create message object with all fields - convert KeyInfo to a JSON-compatible object
  const messageObject = {
    thread_id: threadId,
    role,
    content,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    "10x_cost": tenXCost,
    credit_cost: creditCost,
    predicted_cost: predictedCost,
    summary,
    key_info: keyInfo as unknown as JsonValue // Type assertion to handle the conversion
  };

  console.log('Saving message with object:', JSON.stringify(messageObject));

  const { error } = await supabase
    .from('chat_messages')
    .insert(messageObject);

  if (error) {
    console.error('Error saving message:', error);
    throw error;
  }

  // If this is a user message with key information, update the thread's context data
  if (role === 'user' && keyInfo) {
    try {
      console.log('Updating thread context data for thread:', threadId);
      await updateThreadContextData(threadId, keyInfo);
    } catch (error) {
      console.error('Failed to update thread context data:', error);
    }
  }
};

export const updateThreadContextData = async (
  threadId: string,
  keyInfo: KeyInfo
): Promise<void> => {
  try {
    console.log('Starting updateThreadContextData for thread:', threadId);
    
    // Validate inputs to ensure we have all required data
    if (!threadId || !isValidUUID(threadId)) {
      console.error('Invalid thread ID:', threadId);
      throw new Error(`Invalid thread ID format: ${threadId}`);
    }
    
    if (!keyInfo) {
      console.error('No keyInfo provided for thread:', threadId);
      throw new Error('KeyInfo is required');
    }
    
    // First get current context data
    const { data, error } = await supabase
      .from('chat_threads')
      .select('context_data')
      .eq('id', threadId)
      .single();

    if (error) {
      console.error('Error fetching current context data:', error);
      throw error;
    }

    if (!data) {
      console.error('No thread found with ID:', threadId);
      throw new Error(`Thread not found: ${threadId}`);
    }

    console.log('Current context data:', data?.context_data);

    // Make a clean copy of keyInfo to avoid any circular references
    const cleanKeyInfo = {
      entities: keyInfo.entities || [],
      nounChunks: keyInfo.nounChunks || [],
      keyVerbs: keyInfo.keyVerbs || [],
      svoTriples: keyInfo.svoTriples || [],
      extractionTime: keyInfo.extractionTime || new Date().toISOString(),
      processingModel: keyInfo.processingModel || "unknown"
    };
    
    // Update with new context data
    const currentContextData = data?.context_data || [];
    const newContextItem = {
      timestamp: new Date().toISOString(),
      keyInfo: cleanKeyInfo
    };
    
    // Since we don't know the exact type, create a new array explicitly
    const updatedContextData = [...(currentContextData as any[]), newContextItem];

    // Keep only the most recent 50 context items to prevent excessive growth
    const trimmedContextData = updatedContextData.slice(-50);

    console.log('Updating thread with new context data, items:', trimmedContextData.length);
    console.log('New context item:', JSON.stringify(newContextItem));

    // Ensure the data is valid JSON before saving
    try {
      JSON.stringify(trimmedContextData);
    } catch (jsonError) {
      console.error('Context data is not valid JSON:', jsonError);
      throw new Error('Failed to serialize context data');
    }

    // Add additional debugging before update
    console.log('About to update thread table with context_data. Thread ID:', threadId);
    console.log('Data type of context_data:', typeof trimmedContextData);
    console.log('Is context_data an array?', Array.isArray(trimmedContextData));
    
    // Perform the update with detailed error handling
    const { error: updateError, data: updateData } = await supabase
      .from('chat_threads')
      .update({ context_data: trimmedContextData })
      .eq('id', threadId)
      .select();

    if (updateError) {
      console.error('Error updating thread context data:', updateError);
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error details:', updateError.details);
      throw updateError;
    }

    console.log('Successfully updated thread context data. Response:', updateData);
  } catch (error) {
    console.error('Error in updateThreadContextData:', error);
    throw error;
  }
};

export const updateMessageSummary = async (
  messageId: string,
  summary: string
): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .update({ summary })
    .eq('id', messageId);

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
        tenXCost: msg["10x_cost"],
        summary: msg.summary  // Make sure to map the summary field
      })),
      lastUpdated: new Date(thread.updated_at),
      hidden: thread.hidden
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

export const summarizeMessage = async (content: string, role: 'user' | 'assistant'): Promise<string | null> => {
  try {
    console.log('Generating summary for', role, 'message');
    
    const response = await supabase.functions.invoke('chat', {
      body: {
        summarize: {
          content,
          role
        }
      }
    });

    if (response.error) {
      console.error('Error in summarize message:', response.error);
      return null;
    }

    if (response.data?.error) {
      console.error('Error from summarization service:', response.data.error);
      return null;
    }

    return response.data.summary;
  } catch (error) {
    console.error('Exception in summarizeMessage:', error);
    return null;
  }
};

export const optimizeMessagesForOpenAI = (messages: ChatMessage[]): ChatMessage[] => {
  if (messages.length <= 3) {
    return messages;
  }

  // Keep the system message if present
  const systemMessages = messages.filter(msg => msg.role === 'system');
  
  // For the conversation history, get non-system messages
  const nonSystemMessages = messages
    .filter(msg => msg.role !== 'system');
  
  // Always include the full content of the last assistant message
  const lastAssistantIndex = nonSystemMessages.map(msg => msg.role).lastIndexOf('assistant');
  const lastUserIndex = nonSystemMessages.map(msg => msg.role).lastIndexOf('user');
  
  let optimizedMessages: ChatMessage[] = [...systemMessages];
  
  // Add historical messages using summaries (up to 20 messages)
  const historyMessages = nonSystemMessages.slice(0, -1); // Exclude the most recent message
  
  // Take up to the last 20 historical messages
  const recentHistory = historyMessages.slice(-20);
  
  // Add summarized history, falling back to content when no summary is available
  recentHistory.forEach(msg => {
    optimizedMessages.push({
      ...msg,
      content: msg.summary || msg.content // Fall back to the original content if no summary
    });
  });
  
  // Always add the last user message with full content if not already included
  if (lastUserIndex >= 0) {
    const lastUserMsg = nonSystemMessages[lastUserIndex];
    // Check if we haven't already added this message
    if (!optimizedMessages.some(m => m.id === lastUserMsg.id)) {
      optimizedMessages.push(lastUserMsg);
    }
  }
  
  // Always add the last assistant message with full content if it exists and wasn't already added
  if (lastAssistantIndex >= 0 && lastAssistantIndex !== nonSystemMessages.length - 1) {
    const lastAssistantMsg = nonSystemMessages[lastAssistantIndex];
    // Check if we haven't already added this message
    if (!optimizedMessages.some(m => m.id === lastAssistantMsg.id)) {
      optimizedMessages.push(lastAssistantMsg);
    }
  }
  
  return optimizedMessages;
};

export const sendChatMessage = async (messages: ChatMessage[], generateImage: boolean = false, model: string = '') => {
  try {
    console.log('Sending chat messages to edge function:', messages, 'using model:', model);
    
    // Optimize the messages before sending to OpenAI
    const optimizedMessages = optimizeMessagesForOpenAI(messages);
    console.log('Using optimized messages for OpenAI:', optimizedMessages.length, 'messages');

    const response = await supabase.functions.invoke('chat', {
      body: {
        messages: optimizedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        generateImage,
        model: model
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
      return {
        ...response.data,
        keyInfo: response.data.keyInfo // Include extracted key information
      };
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
    const keyInfo = response.data.keyInfo; // Extract key information from the response

    return {
      content: messageContent,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model: usedModel,
      keyInfo: keyInfo
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
