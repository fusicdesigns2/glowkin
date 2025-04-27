export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  tenXCost?: number; // Added 10x_cost field
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  tokens_used: number;
  "10x_cost"?: number; // Added 10x_cost field
  created_at: Date;
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date;
}

export interface DBThread {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
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
