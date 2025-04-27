
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date;
}
