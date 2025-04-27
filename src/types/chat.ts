
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  tokens_used?: number;
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  tokens_used: number;
  created_at: Date;
}

export interface DBThread {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}
