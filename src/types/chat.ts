
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  tenXCost?: number;
  summary?: string | null;
  keyInfo?: KeyInfo | null;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  tokens_used: number;
  "10x_cost"?: number;
  created_at: Date;
  summary?: string | null;
  key_info?: KeyInfo | null;
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date;
  hidden?: boolean;
  contextData?: ContextData[];
}

export interface ContextData {
  timestamp: string;
  keyInfo: KeyInfo;
}

export interface DBThread {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  hidden: boolean;
  context_data?: ContextData[];
}

export interface ModelCost {
  id: string;
  date: Date;
  model: string;
  in_cost: number;
  out_cost: number;
  active: boolean;
  markup: number;
}

// New types for spaCy extracted information
export interface Entity {
  text: string;
  label: string;
  start: number;
  end: number;
}

export interface NounChunk {
  text: string;
  root: string;
}

export interface KeyVerb {
  text: string;
  lemma: string;
}

export interface SVOTriple {
  subject: string;
  verb: string;
  object: string;
}

export interface KeyInfo {
  entities: Entity[];
  nounChunks: NounChunk[];
  keyVerbs: KeyVerb[];
  svoTriples: SVOTriple[];
  extractionTime: string;
  processingModel: string;
  error?: string;
}
