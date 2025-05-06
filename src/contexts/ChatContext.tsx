import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Thread, ChatMessage } from '@/types/chat';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from './AuthContext';
import { funFactsArray } from '@/data/funFacts';
import { supabase } from '@/integrations/supabase/client';
import { 
  getMessageCostEstimate, 
  createThread,
  saveMessage,
  loadThreadsFromDB,
  sendChatMessage,
  summarizeMessage,
  updateMessageSummary
} from '@/utils/chatUtils';
import { isImageRequest, calculateImageCost } from '@/utils/imageUtils';

interface ChatContextType {
  threads: Thread[];
  currentThread: Thread | null;
  isLoading: boolean;
  createThread: () => void;
  selectThread: (threadId: string) => void;
  sendMessage: (content: string, estimatedCost: number, model?: string) => Promise<void>;
  getMessageCostEstimate: (content: string) => number;
  funFacts: string[];
  currentFunFact: string;
  refreshFunFact: () => void;
  updateThreadInList: (threadId: string, updates: Partial<Thread>) => void;
  setSelectedModel: (model: string) => void;
  hideThread: (threadId: string) => void;
  unhideThread: (threadId: string) => void;
  showAllHiddenThreads: () => void;
  hideAllThreads: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, updateCredits, isLoading: authLoading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [funFacts] = useState<string[]>(funFactsArray);
  const [currentFunFact, setCurrentFunFact] = useState<string>(funFactsArray[0]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [threadModels, setThreadModels] = useState<Record<string, string>>({});
  
  // Add state for image confirmation
  const [imageConfirmOpen, setImageConfirmOpen] = useState(false);
  const [pendingImageRequest, setPendingImageRequest] = useState<{
    content: string;
    estimatedCost: number;
    threadToUse: Thread | null;
    userMessage: ChatMessage | null;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setCurrentThread(null);
      return;
    }

    const loadThreads = async () => {
      try {
        const loadedThreads = await loadThreadsFromDB(user.id);
        setThreads(loadedThreads);
        if (loadedThreads.length > 0) {
          setCurrentThread(loadedThreads[0]);
        }
      } catch (error) {
        console.error('Failed to load threads:', error);
        toast.error('Failed to load chat history');
      }
    };

    loadThreads();
  }, [user]);

  const createNewThread = async () => {
    if (!user) return;
    
    try {
      const threadId = await createThread(user.id, `New Chat ${threads.length + 1}`);
      const newThread: Thread = {
        id: threadId,
        title: `New Chat ${threads.length + 1}`,
        messages: [],
        lastUpdated: new Date(),
        hidden: false,
      };
      
      setThreads([newThread, ...threads]);
      setCurrentThread(newThread);
      return newThread;
    } catch (error) {
      console.error('Failed to create thread:', error);
      toast.error('Failed to create new chat');
      return null;
    }
  };

  const selectThread = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setCurrentThread(thread);
      // Use the thread's model if it has one saved
      if (threadModels[threadId]) {
        setSelectedModel(threadModels[threadId]);
      }
    }
  };

  const updateThreadInList = (threadId: string, updates: Partial<Thread>) => {
    const updatedThreads = threads.map(thread => 
      thread.id === threadId ? { ...thread, ...updates } : thread
    );
    
    setThreads(updatedThreads);
    
    if (currentThread && currentThread.id === threadId) {
      setCurrentThread({ ...currentThread, ...updates });
    }
  };

  // Add thread hiding functionality
  const hideThread = async (threadId: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: true })
        .eq('id', threadId);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => 
        thread.id === threadId ? { ...thread, hidden: true } : thread
      );
      setThreads(updatedThreads);
      
      // If the hidden thread was the current one, select another non-hidden thread
      if (currentThread?.id === threadId) {
        const nextVisibleThread = updatedThreads.find(t => !t.hidden);
        if (nextVisibleThread) {
          setCurrentThread(nextVisibleThread);
        } else {
          // If all threads are hidden, create a new one
          createNewThread();
        }
      }
      
      toast.success("Thread hidden");
    } catch (error) {
      console.error('Error hiding thread:', error);
      toast.error("Failed to hide thread");
    }
  };
  
  const unhideThread = async (threadId: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: false })
        .eq('id', threadId);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => 
        thread.id === threadId ? { ...thread, hidden: false } : thread
      );
      setThreads(updatedThreads);
      
      toast.success("Thread unhidden");
    } catch (error) {
      console.error('Error unhiding thread:', error);
      toast.error("Failed to unhide thread");
    }
  };
  
  const showAllHiddenThreads = async () => {
    try {
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: false })
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => ({ ...thread, hidden: false }));
      setThreads(updatedThreads);
      
      toast.success("All threads unhidden");
    } catch (error) {
      console.error('Error unhiding all threads:', error);
      toast.error("Failed to unhide threads");
    }
  };
  
  const hideAllThreads = async () => {
    try {
      // First create a new thread to avoid having all threads hidden
      const newThread = await createNewThread();
      if (!newThread) return;
      
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: true })
        .eq('user_id', user?.id)
        .neq('id', newThread.id);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => 
        thread.id !== newThread.id ? { ...thread, hidden: true } : thread
      );
      setThreads(updatedThreads);
      
      toast.success("All previous threads hidden");
    } catch (error) {
      console.error('Error hiding all threads:', error);
      toast.error("Failed to hide threads");
    }
  };

  // Set model for the current thread
  const setSelectedModelForThread = (model: string) => {
    setSelectedModel(model);
    
    if (currentThread) {
      setThreadModels(prev => ({
        ...prev,
        [currentThread.id]: model
      }));
    }
  };

  // Modified to handle image generation confirmation
  const sendMessage = async (content: string, estimatedCost: number, model?: string) => {
    if (!user || !profile) {
      toast.error('You need to be logged in to send messages');
      return;
    }

    if (profile.credits < estimatedCost) {
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
    
    // Save the model for this thread
    if (modelToUse && threadToUse) {
      setThreadModels(prev => ({
        ...prev,
        [threadToUse.id]: modelToUse
      }));
    }

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
  
  // This function handles sending a regular non-image message
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
        userMessageSummary
      );

      // Use the thread's stored model or the passed model
      const aiResponse = await sendChatMessage(updatedThread.messages, false, modelToUse);
      
      if (typeof aiResponse === 'string') {
        toast.error(aiResponse);
        return;
      }
      
      const { content: aiResponseContent, input_tokens, output_tokens, model: usedModel } = aiResponse;
      
      const tenXCost = Math.ceil(estimatedCost * 10);

      // Generate summary for the assistant message
      const assistantMessageSummary = await summarizeMessage(aiResponseContent, 'assistant');

      await saveMessage(
        updatedThread.id, 
        'assistant', 
        aiResponseContent, 
        usedModel, 
        input_tokens, 
        output_tokens,
        tenXCost,
        estimatedCost,
        assistantMessageSummary
      );

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date(),
        model: modelToUse,
        input_tokens: input_tokens,
        output_tokens: output_tokens,
        tenXCost,
        summary: assistantMessageSummary
      };

      const finalThread = {
        ...updatedThread,
        messages: [...updatedThread.messages, aiMessage],
        lastUpdated: new Date(),
      };

      await updateCredits(profile.credits - estimatedCost);
      toast.success(`${estimatedCost} credits used for this response`);

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
  
  // New function to handle image generation after confirmation
  const handleImageGeneration = async () => {
    if (!pendingImageRequest || !user || !profile) return;
    
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
      
      await updateCredits(profile.credits - imageCost);
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
  
  // Handle cancellation of image generation
  const handleCancelImageGeneration = async () => {
    if (!pendingImageRequest || !user || !profile) return;
    
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

  const refreshFunFact = () => {
    const randomIndex = Math.floor(Math.random() * funFacts.length);
    setCurrentFunFact(funFacts[randomIndex]);
  };

  const value = {
    threads,
    currentThread,
    isLoading,
    createThread: createNewThread,
    selectThread,
    sendMessage,
    getMessageCostEstimate,
    funFacts,
    currentFunFact,
    refreshFunFact,
    updateThreadInList,
    setSelectedModel: setSelectedModelForThread,
    hideThread,
    unhideThread,
    showAllHiddenThreads,
    hideAllThreads
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
      
      {/* Error Dialog for when image generation fails */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Images Not Yet Supported</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 text-center">
                <p>Images are not yet supported. We are working on it.</p>
                <p>Let us know at <a href="https://facebook.com/chat-ai-box" className="text-blue-500 underline">facebook.com/chat-ai-box</a> that you'd love images and maybe we can give you an update.</p>
                <p className="mt-4 font-semibold">Thank you for your support!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Image Generation Confirmation Dialog */}
      <ConfirmDialog
        open={imageConfirmOpen}
        onOpenChange={setImageConfirmOpen}
        title="Generate an Image?"
        description={`This appears to be an image generation request. Would you like to generate an image using DALL-E 3? This will cost approximately ${calculateImageCost} credits.`}
        confirmText="Yes, Generate Image"
        cancelText="No, Just Answer"
        onConfirm={handleImageGeneration}
        onCancel={handleCancelImageGeneration}
      />
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
