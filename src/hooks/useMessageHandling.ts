
import { useState, useEffect } from 'react';
import { Thread, ChatMessage, ImageRequestData } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { sendChatMessage, saveMessage, summarizeMessage } from '@/utils/chatUtils';
import { toast } from 'sonner';

export const useMessageHandling = (
  threads: Thread[],
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>,
  currentThread: Thread | null,
  setCurrentThread: React.Dispatch<React.SetStateAction<Thread | null>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  refreshFunFact: () => void,
  threadModels: Record<string, string>,
  selectedModel: string,
  createThread: (projectId?: string) => Promise<Thread | null>,
  updateCredits: (amount: number) => Promise<void>,
  userId?: string,
  availableCredits?: number
) => {
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [imageConfirmOpen, setImageConfirmOpen] = useState(false);
  const [imageRequestData, setImageRequestData] = useState<ImageRequestData | null>(null);
  
  // Detect image generation requests
  const detectImageRequest = (content: string): boolean => {
    const imageRequestTerms = [
      'generate image',
      'create image',
      'make image',
      'draw',
      'generate a picture',
      'create a picture',
      'make a picture',
      'generate an image',
      'generate me an image',
      'create an image for',
      'imagine'
    ];
    
    // Convert content to lowercase for case-insensitive matching
    const lowerContent = content.toLowerCase();
    
    // Check if any of the image request terms are in the content
    return imageRequestTerms.some(term => lowerContent.includes(term));
  };
  
  const sendMessage = async (content: string, estimatedCost: number, model?: string) => {
    if (!userId) return;
    
    // Check if the user has enough credits
    if (availableCredits !== undefined && availableCredits < estimatedCost) {
      toast.error("Not enough credits to send this message");
      return;
    }
    
    // Check if this appears to be an image generation request
    if (detectImageRequest(content)) {
      // Store the message data to use after confirmation
      setImageRequestData({
        content,
        estimatedCost,
        threadToUse: currentThread,
        userMessage: null
      });
      
      // Open confirmation dialog
      setImageConfirmOpen(true);
      return;
    }

    // Get thread or create a new one
    let threadToUse = currentThread;
    
    if (!threadToUse) {
      const newThread = await createThread();
      if (!newThread) {
        toast.error("Failed to create a thread");
        return;
      }
      threadToUse = newThread;
    }
    
    try {
      setIsLoading(true);
      
      // Add user message to state
      const timestamp = new Date();
      const userMessageId = crypto.randomUUID();
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: content,
        timestamp,
        input_tokens: 0,
        output_tokens: 0,
      };
      
      const updatedThread = {
        ...threadToUse,
        messages: [...threadToUse.messages, userMessage]
      };
      
      // Update the thread in state
      setThreads(threads.map(t => 
        t.id === threadToUse!.id ? updatedThread : t
      ));
      setCurrentThread(updatedThread);
      
      // Get combined system prompt (project + thread)
      let systemPrompt = threadToUse.system_prompt || '';
      if (threadToUse.project_id) {
        const project = threads
          .find(thread => thread.id === threadToUse!.id)?.project_id || null;
        
        if (project) {
          const projectData = await supabase
            .from('projects')
            .select('system_prompt')
            .eq('id', project)
            .single();
          
          if (projectData.data && projectData.data.system_prompt) {
            systemPrompt = projectData.data.system_prompt + 
              (systemPrompt ? '\n\n' + systemPrompt : '');
          }
        }
      }
      
      // Prepare messages array for API call
      const messagesToSend: ChatMessage[] = [];
      
      // Add system prompt if exists
      if (systemPrompt) {
        messagesToSend.push({
          id: 'system-prompt',
          role: 'system',
          content: systemPrompt,
          timestamp: new Date()
        });
      }
      
      // Add context from thread's messages
      const contextMessages = threadToUse.messages.slice(-10); // Last 10 messages as context
      messagesToSend.push(...contextMessages);
      
      // Add the new user message
      messagesToSend.push(userMessage);
      
      // Use the selected model for this thread, or default to the global selected model
      const modelToUse = threadModels[threadToUse.id] || model || selectedModel;
      
      // Send the message to the API
      const response = await sendChatMessage(messagesToSend, false, modelToUse);
      
      if (typeof response === 'string') {
        // Error response
        toast.error(response);
        return;
      }
      
      // Create assistant message
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        model: response.model,
        input_tokens: response.input_tokens,
        output_tokens: response.output_tokens,
        keyInfo: response.keyInfo
      };
      
      // Generate a summary for the user message
      const userSummary = await summarizeMessage(content, 'user');
      
      // Generate a summary for the assistant message
      const assistantSummary = await summarizeMessage(response.content, 'assistant');
      
      // Update the user message with the summary
      const updatedUserMessage = {
        ...userMessage,
        summary: userSummary,
        keyInfo: response.keyInfo
      };
      
      // Update the assistant message with the summary
      const updatedAssistantMessage = {
        ...assistantMessage,
        summary: assistantSummary
      };
      
      // Save messages to database
      try {
        // Save user message
        await saveMessage(
          threadToUse.id,
          'user',
          content,
          modelToUse,
          0,
          0,
          0,
          estimatedCost,
          userSummary,
          response.keyInfo
        );
        
        // Save assistant message
        await saveMessage(
          threadToUse.id,
          'assistant',
          response.content,
          modelToUse,
          response.input_tokens,
          response.output_tokens,
          0,
          0,
          assistantSummary,
          null
        );
      } catch (error) {
        console.error('Error saving messages to database:', error);
      }
      
      // Update thread in state with both messages
      const finalMessages = threadToUse.messages.map(msg => 
        msg.id === userMessageId ? updatedUserMessage : msg
      );
      
      const finalThread = {
        ...threadToUse,
        messages: [...finalMessages, updatedAssistantMessage],
        lastUpdated: new Date()
      };
      
      setThreads(threads.map(t => 
        t.id === threadToUse!.id ? finalThread : t
      ));
      setCurrentThread(finalThread);
      
      // Deduct credits
      await updateCredits(-estimatedCost);
      
      // Refresh the fun fact
      refreshFunFact();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImageGeneration = async () => {
    if (!imageRequestData) return;
    
    // Set imageConfirmOpen to false as we're handling the request now
    setImageConfirmOpen(false);
    
    // Show error dialog
    setErrorDialogOpen(true);
  };
  
  const handleCancelImageGeneration = async () => {
    // User chose to just get a text response
    setImageConfirmOpen(false);
    
    if (!imageRequestData) return;
    await sendMessage(imageRequestData.content, imageRequestData.estimatedCost);
  };
  
  return {
    sendMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    imageConfirmOpen,
    setImageConfirmOpen,
    handleImageGeneration,
    handleCancelImageGeneration
  };
};
