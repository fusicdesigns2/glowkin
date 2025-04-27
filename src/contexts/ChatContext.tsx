
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { Thread, ChatMessage } from '@/types/chat';
import { funFactsArray } from '@/data/funFacts';
import { 
  getMessageCostEstimate, 
  loadThreadsFromStorage, 
  saveThreadsToStorage,
  sendChatMessage 
} from '@/utils/chatUtils';

interface ChatContextType {
  threads: Thread[];
  currentThread: Thread | null;
  isLoading: boolean;
  createThread: () => void;
  selectThread: (threadId: string) => void;
  sendMessage: (content: string, estimatedCost: number) => Promise<void>;
  getMessageCostEstimate: (content: string) => number;
  funFacts: string[];
  currentFunFact: string;
  refreshFunFact: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, updateCredits } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [funFacts] = useState<string[]>(funFactsArray);
  const [currentFunFact, setCurrentFunFact] = useState<string>(funFactsArray[0]);

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setCurrentThread(null);
      return;
    }

    const loadedThreads = loadThreadsFromStorage(user.id);
    if (loadedThreads) {
      setThreads(loadedThreads);
      if (loadedThreads.length > 0) {
        setCurrentThread(loadedThreads[0]);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && threads.length > 0) {
      saveThreadsToStorage(user.id, threads);
    }
  }, [threads, user]);

  const refreshFunFact = () => {
    const randomIndex = Math.floor(Math.random() * funFacts.length);
    setCurrentFunFact(funFacts[randomIndex]);
  };

  const createThread = () => {
    if (!user) return;
    
    const newThread: Thread = {
      id: `thread_${Date.now()}`,
      title: `New Chat ${threads.length + 1}`,
      messages: [],
      lastUpdated: new Date(),
    };
    
    setThreads([newThread, ...threads]);
    setCurrentThread(newThread);
  };

  const selectThread = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setCurrentThread(thread);
    }
  };

  const sendMessage = async (content: string, estimatedCost: number) => {
    if (!user || !profile) {
      toast.error('You need to be logged in to send messages');
      return;
    }

    if (profile.credits < estimatedCost) {
      toast.error(`Not enough credits. You need ${estimatedCost} credits for this message.`);
      return;
    }

    if (!currentThread) {
      createThread();
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
        ...(currentThread as Thread),
        messages: [...(currentThread?.messages || []), userMessage],
        lastUpdated: new Date(),
      };

      setCurrentThread(updatedThread);
      setThreads(threads.map(t => t.id === updatedThread.id ? updatedThread : t));

      const aiResponse = await sendChatMessage(updatedThread.messages);
      
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      const finalThread = {
        ...updatedThread,
        messages: [...updatedThread.messages, aiMessage],
        lastUpdated: new Date(),
      };

      setCurrentThread(finalThread);
      setThreads(threads.map(t => t.id === finalThread.id ? finalThread : t));

      await updateCredits(profile.credits - estimatedCost);
      toast.success(`${estimatedCost} credits used for this response`);

    } catch (error) {
      toast.error('Failed to get response: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        threads,
        currentThread,
        isLoading,
        createThread,
        selectThread,
        sendMessage,
        getMessageCostEstimate,
        funFacts,
        currentFunFact,
        refreshFunFact
      }}
    >
      {children}
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
