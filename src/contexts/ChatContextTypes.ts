
import { Thread, ChatMessage, KeyInfo } from '@/types/chat';

export interface ChatContextState {
  threads: Thread[];
  currentThread: Thread | null;
  isLoading: boolean;
  funFacts: string[];
  currentFunFact: string;
  selectedModel: string;
  threadModels: Record<string, string>;
}

export interface ImageRequestData {
  content: string;
  estimatedCost: number;
  threadToUse: Thread | null;
  userMessage: ChatMessage | null;
}

export interface ChatContextProviderProps {
  children: React.ReactNode;
}
