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
import { useAuth } from './AuthContext';
import { funFactsArray } from '@/data/funFacts';
import { supabase } from '@/integrations/supabase/client';
import { 
  getMessageCostEstimate, 
  createThread,
  saveMessage,
  loadThreadsFromDB,
  sendChatMessage 
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

  const sendMessage = async (content: string, estimatedCost: number, model = 'gpt-4.1-mini-2025-04-14') => {
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

    setIsLoading(true);
    refreshFunFact();

    try {
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
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
        0
      );

      if (isImageRequest(content)) {
        const imageCost = await calculateImageCost();
        if (!window.confirm(
          `This appears to be an image generation request. The following prompt will be used:\n\n"${content}"\n\nGenerating an image will cost ${imageCost} credits. Would you like to proceed?`
        )) {
          const cancelMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: "Image generation was cancelled. How else can I help you?",
            timestamp: new Date(),
            model: 'gpt-4o-mini',
          };
          
          setCurrentThread({
            ...updatedThread,
            messages: [...updatedThread.messages, cancelMessage],
          });
          setIsLoading(false);
          return;
        }

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

        const { data: imageData } = await supabase
          .from('chat_images')
          .insert({
            message_id: userMessage.id,
            image_url: imageUrl,
            prompt: content
          })
          .select()
          .single();

        const aiMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: `![Generated Image](${imageUrl})\n\nHere's the image you requested. Let me know if you'd like any adjustments.`,
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
          aiMessage.tenXCost
        );

        await updateCredits(profile.credits - imageCost);
        toast.success(`${imageCost} credits used for this image`);

        setCurrentThread({
          ...updatedThread,
          messages: [...updatedThread.messages, aiMessage],
        });

      } else {
        const aiResponse = await sendChatMessage(updatedThread.messages, false, model);
        
        if (typeof aiResponse === 'string') {
          toast.error(aiResponse);
          return;
        }
        
        const { content: aiResponseContent, input_tokens, output_tokens, model: usedModel } = aiResponse;
        
        const tenXCost = Math.ceil(estimatedCost * 10);

        await saveMessage(
          updatedThread.id, 
          'assistant', 
          aiResponseContent, 
          usedModel, 
          input_tokens, 
          output_tokens,
          tenXCost
        );

        const aiMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: aiResponseContent,
          timestamp: new Date(),
          model: model,
          input_tokens: input_tokens,
          output_tokens: output_tokens,
          tenXCost
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
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(`Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
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
    updateThreadInList
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
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
