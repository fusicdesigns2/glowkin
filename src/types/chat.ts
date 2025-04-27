
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
