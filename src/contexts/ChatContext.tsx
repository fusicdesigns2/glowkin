
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Thread, ChatMessage, ChatContextType } from '@/types/chat';
import { ChatContextProviderProps } from './ChatContextTypes';
import { useAuth } from './AuthContext';
import { loadThreadsFromDB, getMessageCostEstimate } from '@/utils/chatUtils';
import { useThreadOperations } from '@/hooks/useThreadOperations';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useFunFacts } from '@/hooks/useFunFacts';
import { calculateImageCost } from '@/utils/imageUtils';
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

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: ChatContextProviderProps) => {
  // Auth context
  const { user, profile, updateCredits, isLoading: authLoading } = useAuth();
  
  // State variables
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [threadModels, setThreadModels] = useState<Record<string, string>>({});
  
  // Custom hooks
  const { funFacts, currentFunFact, refreshFunFact } = useFunFacts();
  
  const threadOps = useThreadOperations(
    user?.id,
    threads,
    setThreads,
    setCurrentThread,
    currentThread
  );
  
  const messageHandling = useMessageHandling(
    threads,
    setThreads,
    currentThread,
    setCurrentThread,
    setIsLoading,
    refreshFunFact,
    threadModels,
    selectedModel,
    threadOps.createNewThread,
    updateCredits,
    user?.id,
    profile?.credits
  );
  
  // Load threads on user login
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
      }
    };

    loadThreads();
  }, [user]);

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

  // Context value
  const value: ChatContextType = {
    threads,
    currentThread,
    isLoading,
    createThread: threadOps.createNewThread,
    selectThread: threadOps.selectThread,
    sendMessage: messageHandling.sendMessage,
    getMessageCostEstimate,
    funFacts,
    currentFunFact,
    refreshFunFact,
    updateThreadInList: threadOps.updateThreadInList,
    setSelectedModel: setSelectedModelForThread,
    hideThread: threadOps.hideThread,
    unhideThread: threadOps.unhideThread,
    showAllHiddenThreads: threadOps.showAllHiddenThreads,
    hideAllThreads: threadOps.hideAllThreads,
    updateThreadSystemPrompt: threadOps.updateThreadSystemPrompt
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
      
      {/* Error Dialog for when image generation fails */}
      <AlertDialog open={messageHandling.errorDialogOpen} onOpenChange={messageHandling.setErrorDialogOpen}>
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
        open={messageHandling.imageConfirmOpen}
        onOpenChange={messageHandling.setImageConfirmOpen}
        title="Generate an Image?"
        description={`This appears to be an image generation request. Would you like to generate an image using DALL-E 3? This will cost approximately ${calculateImageCost} credits.`}
        confirmText="Yes, Generate Image"
        cancelText="No, Just Answer"
        onConfirm={messageHandling.handleImageGeneration}
        onCancel={messageHandling.handleCancelImageGeneration}
      />
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
