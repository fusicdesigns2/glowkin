
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date;
}

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

const funFactsArray = [
  "The first computer bug was literally a bug - a moth found in a Harvard Mark II computer in 1947!",
  "An AI assistant like me consumes roughly 10-20 watts of power to answer a question - much less than a human brain!",
  "The term 'artificial intelligence' was first coined in 1956 at Dartmouth College.",
  "ChatGPT was trained on approximately 570GB of data, equivalent to about 300,000 books!",
  "The average human types 40 words per minute, while AI can generate over 100 words per second!",
  "AI models like me don't actually 'know' anything - we're just very good at predicting what text should come next.",
  "GPT-4 has about 1.8 trillion parameters, while the human brain has about 100 trillion synapses.",
  "About 97% of the AI prompts people type include at least one typo or grammatical error - but we can usually understand anyway!",
  "If printed on paper, the data used to train large language models would create a stack higher than Mount Everest!",
  "AI can now generate images, music, and code - but still can't tell if your jokes are actually funny!",
];

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, updateCredits } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [funFacts] = useState<string[]>(funFactsArray);
  const [currentFunFact, setCurrentFunFact] = useState<string>(funFactsArray[0]);

  // Load threads from local storage
  useEffect(() => {
    if (!user) {
      setThreads([]);
      setCurrentThread(null);
      return;
    }

    const storedThreads = localStorage.getItem(`maimai_threads_${user.id}`);
    if (storedThreads) {
      try {
        const parsedThreads = JSON.parse(storedThreads).map((thread: any) => ({
          ...thread,
          lastUpdated: new Date(thread.lastUpdated),
          messages: thread.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setThreads(parsedThreads);
        if (parsedThreads.length > 0) {
          setCurrentThread(parsedThreads[0]);
        }
      } catch (e) {
        console.error('Failed to parse stored threads:', e);
      }
    }
  }, [user]);

  // Save threads to local storage
  useEffect(() => {
    if (user && threads.length > 0) {
      localStorage.setItem(`maimai_threads_${user.id}`, JSON.stringify(threads));
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

  const getMessageCostEstimate = (content: string) => {
    // This is a simplified cost estimate based on character count
    // In a real app, you would calculate this based on token count and model pricing
    const charCount = content.length;
    const creditsPerChar = 0.01; // 1 credit per 100 chars
    return Math.max(1, Math.ceil(charCount * creditsPerChar));
  };

  const sendMessage = async (content: string, estimatedCost: number) => {
    if (!user) {
      toast.error('You need to be logged in to send messages');
      return;
    }

    if (user.credits < estimatedCost) {
      toast.error(`Not enough credits. You need ${estimatedCost} credits for this message.`);
      return;
    }

    if (!currentThread) {
      createThread();
    }

    setIsLoading(true);
    refreshFunFact();

    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      // Update thread with user message first
      const updatedThread = {
        ...(currentThread as Thread),
        messages: [...(currentThread?.messages || []), userMessage],
        lastUpdated: new Date(),
      };

      setCurrentThread(updatedThread);
      setThreads(threads.map(t => t.id === updatedThread.id ? updatedThread : t));

      // Simulate network delay and AI processing time
      await new Promise(r => setTimeout(r, 2000));

      // Generate AI response (mock)
      const aiResponses = [
        "That's a fascinating question! Based on my knowledge, I'd say it depends on various factors. What specifically are you trying to understand?",
        "Great question! From what I understand, there are multiple perspectives on this topic. Would you like me to explore a specific aspect in more detail?",
        "I've analyzed your question and found some interesting information. The key insight is that this area has been evolving rapidly in recent years.",
        "Thanks for asking! This is actually a complex topic with several important considerations. Let me break it down for you step by step.",
        "I appreciate your curiosity! The answer involves a combination of factors, including recent research and established principles in this field."
      ];
      
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
      };

      // Update thread with AI response
      const finalThread = {
        ...updatedThread,
        messages: [...updatedThread.messages, aiMessage],
        lastUpdated: new Date(),
      };

      setCurrentThread(finalThread);
      setThreads(threads.map(t => t.id === finalThread.id ? finalThread : t));

      // Deduct credits
      updateCredits(user.credits - estimatedCost);
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
