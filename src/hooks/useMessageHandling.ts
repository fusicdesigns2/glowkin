import { useState } from 'react';
import { toast } from 'sonner';
import { Thread, ChatMessage } from '@/types/chat';
import { getMessageCostEstimate, saveMessage, sendChatMessage, summarizeMessage } from '@/utils/chatUtils';
import { ImageRequestData } from '@/contexts/ChatContextTypes';
import { isImageRequest, calculateImageCost } from '@/utils/imageUtils';
import { supabase } from '@/integrations/supabase/client';

export const useMessageHandling = (
  threads: Thread[],
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>,
  currentThread: Thread | null, 
  setCurrentThread: React.Dispatch<React.SetStateAction<Thread | null>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  refreshFunFact: () => void,
  threadModels: Record<string, string>,
  selectedModel: string,
  createNewThread: () => Promise<Thread | null>,
  updateCredits: (credits: number) => Promise<void>,
  userId: string | undefined,
  userCredits: number | undefined
) => {
  const [imageConfirmOpen, setImageConfirmOpen] = useState(false);
  const [pendingImageRequest, setPendingImageRequest] = useState<ImageRequestData | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  // Process regular message
  const processRegularMessage = async (
    content: string, 
    estimatedCost: number, 
    threadToUse: Thread, 
    modelToUse: string
  ) => {
    setIsLoading(true);
    refreshFunFact();
    
    try {
      // Generate summary for the user message
      const userMessageSummary = await summarizeMessage(content, 'user');

      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        summary: userMessageSummary
      };

      const updatedThread = {
        ...threadToUse,
        messages: [...threadToUse.messages, userMessage],
        lastUpdated: new Date(),
      };

      setCurrentThread(updatedThread);
      
      await saveMessage(
        updatedThread.id, 
        'user', 
        content, 
        'user-message', 
        0, 
        0,
        0,
        estimatedCost,
        userMessageSummary,
        null // Initially no key info until we get it back from the API
      );

      // Create messages array with system prompt if present
      const messagesWithSystemPrompt = [...updatedThread.messages];
      
      // If the thread has a system prompt, add it to the messages
      if (updatedThread.system_prompt) {
        // For OpenAI API, prepend a system message to give instructions
        messagesWithSystemPrompt.unshift({
          id: `system_${Date.now()}`,
          role: 'system',
          content: updatedThread.system_prompt,
          timestamp: new Date()
        });
      }
      
      // Use the thread's stored model or the passed model
      const aiResponse = await sendChatMessage(messagesWithSystemPrompt, false, modelToUse);
      
      if (typeof aiResponse === 'string') {
        toast.error(aiResponse);
        return;
      }
      
      const { content: aiResponseContent, input_tokens, output_tokens, model: usedModel, keyInfo } = aiResponse;
      
      const tenXCost = Math.ceil(estimatedCost * 10);

      // Generate summary for the assistant message
      const assistantMessageSummary = await summarizeMessage(aiResponseContent, 'assistant');

      // If we have extracted key information from the user's message, update the message
      if (keyInfo) {
        // Update the user message with the extracted key information
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ key_info: keyInfo as unknown as Json })
          .eq('thread_id', updatedThread.id)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (updateError) {
          console.error('Error updating message with key info:', updateError);
        } else {
          console.log('Message updated with key information');
        }
      }

      await saveMessage(
        updatedThread.id, 
        'assistant', 
        aiResponseContent, 
        usedModel, 
        input_tokens, 
        output_tokens,
        tenXCost,
        estimatedCost,
        assistantMessageSummary,
        null // Assistant messages don't have key info
      );

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date(),
        model: modelToUse,
        input_tokens,
        output_tokens,
        tenXCost,
        summary: assistantMessageSummary
      };

      const finalThread = {
        ...updatedThread,
        messages: [...updatedThread.messages, aiMessage],
        lastUpdated: new Date(),
      };

      if (userCredits !== undefined) {
        await updateCredits(userCredits - estimatedCost);
        toast.success(`${estimatedCost} credits used for this response`);
      }

      setCurrentThread(finalThread);
      setThreads(prev => {
        const existingIndex = prev.findIndex(t => t.id === finalThread.id);
        if (existingIndex >= 0) {
          return prev.map(t => t.id === finalThread.id ? finalThread : t);
        } else {
          return [finalThread, ...prev];
        }
      });
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(`Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle image generation
  const handleImageGeneration = async () => {
    if (!pendingImageRequest || !userId || userCredits === undefined) return;
    
    const { content, estimatedCost, threadToUse, userMessage } = pendingImageRequest;
    if (!threadToUse || !userMessage) return;
    
    setIsLoading(true);
    refreshFunFact();
    
    try {
      // Add the user message to the thread
      const updatedThread = {
        ...threadToUse,
        messages: [...threadToUse.messages, userMessage],
        lastUpdated: new Date(),
      };
      
      setCurrentThread(updatedThread);
      
      await saveMessage(
        updatedThread.id, 
        'user', 
        content, 
        'user-message', 
        0, 
        0,
        0,
        estimatedCost,
        userMessage.summary
      );
      
      const imageCost = await calculateImageCost();
      
      // Generate the image
      const imageResponse = await sendChatMessage(updatedThread.messages, true);
      
      if (typeof imageResponse === 'string') {
        toast.error(imageResponse);
        return;
      }
      
      if ('error' in imageResponse) {
        setErrorDialogOpen(true);
        return;
      }
      
      const { url: imageUrl, model } = imageResponse;
      
      // Store image metadata
      const { data: imageData } = await supabase
        .from('chat_images')
        .insert({
          message_id: userMessage.id,
          image_url: imageUrl,
          prompt: content
        })
        .select()
        .single();
      
      // Create AI response with image and download button
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `![Generated Image](${imageUrl})\n\nHere's the image you requested. You can download it using the button below.\n\n<download-image url="${imageUrl}" prompt="${content.replace(/"/g, '&quot;')}"/>`,
        timestamp: new Date(),
        model: model,
        tenXCost: Math.ceil(imageCost * 10)
      };
      
      await saveMessage(
        updatedThread.id,
        'assistant',
        aiMessage.content,
        model,
        0,
        0,
        aiMessage.tenXCost,
        estimatedCost
      );
      
      await updateCredits(userCredits - imageCost);
      toast.success(`${imageCost} credits used for this image`);
      
      setCurrentThread({
        ...updatedThread,
        messages: [...updatedThread.messages, aiMessage],
      });
      
      setThreads(prev => {
        const existingIndex = prev.findIndex(t => t.id === updatedThread.id);
        if (existingIndex >= 0) {
          return prev.map(t => t.id === updatedThread.id ? {
            ...updatedThread,
            messages: [...updatedThread.messages, aiMessage]
          } : t);
        } else {
          return [{
            ...updatedThread,
            messages: [...updatedThread.messages, aiMessage]
          }, ...prev];
        }
      });
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setPendingImageRequest(null);
    }
  };
  
  // Handle sending a message
  const sendMessage = async (content: string, estimatedCost: number, model?: string) => {
    if (!userId || userCredits === undefined) {
      toast.error('You need to be logged in to send messages');
      return;
    }

    if (userCredits < estimatedCost) {
      toast.error(`Not enough credits. You need ${estimatedCost} credits for this message.`);
      return;
    }

    let threadToUse = currentThread;
    if (!threadToUse) {
      threadToUse = await createNewThread();
      if (!threadToUse) return;
    }

    // Use the thread's stored model or the passed model
    const modelToUse = model || threadModels[threadToUse.id] || selectedModel;

    // Check if this is potentially an image request
    if (isImageRequest(content)) {
      // Generate summary for the user message
      const userMessageSummary = await summarizeMessage(content, 'user');

      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        summary: userMessageSummary
      };

      // Store the info needed for image generation
      setPendingImageRequest({
        content,
        estimatedCost,
        threadToUse,
        userMessage
      });
      
      // Show confirmation dialog instead of automatically generating
      setImageConfirmOpen(true);
      return;
    }

    // Regular message processing
    await processRegularMessage(content, estimatedCost, threadToUse, modelToUse);
  };
  
  // Cancel image generation
  const handleCancelImageGeneration = async () => {
    if (!pendingImageRequest || !userId || userCredits === undefined) return;
    
    const { content, estimatedCost, threadToUse, userMessage } = pendingImageRequest;
    if (!threadToUse || !userMessage) return;
    
    // Add the user message to the thread
    const updatedThread = {
      ...threadToUse,
      messages: [...threadToUse.messages, userMessage],
      lastUpdated: new Date(),
    };
    
    setCurrentThread(updatedThread);
    
    await saveMessage(
      updatedThread.id, 
      'user', 
      content, 
      'user-message', 
      0, 
      0,
      0,
      estimatedCost,
      userMessage.summary
    );
    
    // Process as regular message instead
    await processRegularMessage(content, estimatedCost, updatedThread, threadModels[threadToUse.id] || selectedModel);
    setPendingImageRequest(null);
  };

  return {
    sendMessage,
    handleImageGeneration,
    handleCancelImageGeneration,
    imageConfirmOpen,
    setImageConfirmOpen,
    errorDialogOpen,
    setErrorDialogOpen,
    pendingImageRequest
  };
};
