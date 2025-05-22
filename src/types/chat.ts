
export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: Date;
  hidden?: boolean;
  system_prompt?: string;
  project_id?: string | null;
}
