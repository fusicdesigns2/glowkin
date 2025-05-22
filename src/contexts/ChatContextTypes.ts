
import { Thread, ChatMessage, KeyInfo, Project } from '@/types/chat';

export interface ChatContextState {
  threads: Thread[];
  projects: Project[];
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
