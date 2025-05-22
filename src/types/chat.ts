
export interface KeyInfo {
  entities: Entity[];
  nounChunks: NounChunk[];
  keyVerbs: KeyVerb[];
  svoTriples: SVOTriple[];
  categories: string[];
  topics: string[];
}

export interface Entity {
  text: string;
  type: string;
}

export interface NounChunk {
  text: string;
}

export interface KeyVerb {
  text: string;
}

export interface SVOTriple {
  subject: string;
  verb: string;
  object: string;
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date;
  hidden?: boolean;
  system_prompt?: string;
  project_id?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  tenXCost?: number;
  summary?: string;
  keyInfo?: KeyInfo;
}

export interface ModelCost {
  id: string;
  date: Date;
  model: string;
  in_cost: number;
  out_cost: number;
  active: boolean;
  markup: number;
  predicted_cost?: number;
  predicted_avg_in_words?: number;
  predicted_avg_out_words?: number;
  prediction_date?: Date;
  PerUnit?: string;
}

export interface Project {
  id: string;
  name: string;
  system_prompt?: string | null;
  hidden: boolean;
  context_data: any[];
  created_at: Date;
  updated_at: Date;
}

export interface ChatContextType {
  threads: Thread[];
  projects: Project[];
  currentThread: Thread | null;
  isLoading: boolean;
  createThread: (projectId?: string) => Promise<Thread | null>;
  createProject: (name: string, systemPrompt?: string) => Promise<string | null>;
  selectThread: (threadId: string) => Thread | null;
  sendMessage: (content: string, estimatedCost: number, model?: string) => Promise<void>;
  getMessageCostEstimate: (message: string, model: string) => Promise<number>;
  funFacts: string[];
  currentFunFact: string;
  refreshFunFact: () => void;
  updateThreadInList: (threadId: string, updates: Partial<Thread>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  setSelectedModel: (model: string) => void;
  hideThread: (threadId: string) => Promise<void>;
  unhideThread: (threadId: string) => Promise<void>;
  showAllHiddenThreads: () => Promise<void>;
  hideAllThreads: () => Promise<void>;
  hideProject: (projectId: string) => Promise<void>;
  unhideProject: (projectId: string) => Promise<void>;
  updateThreadSystemPrompt: (threadId: string, systemPrompt: string) => Promise<void>;
  createThreadInProject: (projectId: string) => Promise<void>;
  moveThreadToProject: (threadId: string, projectId: string) => Promise<void>;
}
