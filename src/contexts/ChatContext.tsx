
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { Thread, ChatMessage } from '@/types/chat';
import { funFactsArray } from '@/data/funFacts';
import { 
  getMessageCostEstimate, 
  createThread,
  saveMessage,
  loadThreadsFromDB,
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
  const { user, profile, updateCredits, isLoading: authLoading } = useAuth();
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

  const sendMessage = async (content: string, estimatedCost: number) => {
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
      
      // Updated to match new saveMessage signature with input and output tokens
      await saveMessage(updatedThread.id, 'user', content, 'user-message', 0, 0);

      const response = await sendChatMessage(updatedThread.messages);
      
      if (typeof response === 'string') {
        toast.error(response);
        return;
      }
      
      // Updated to use the new property names
      const { content: aiResponse, input_tokens, output_tokens, model } = response;
      
      // Updated to match new saveMessage signature with input and output tokens
      await saveMessage(updatedThread.id, 'assistant', aiResponse, model, input_tokens, output_tokens);

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        model: model,
        input_tokens: input_tokens,
        output_tokens: output_tokens
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
    refreshFunFact
  };

  return (
    <ChatContext.Provider value={value}>
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
