
export const loadThreadsFromDB = async (userId: string): Promise<Thread[]> => {
  const { data: threads, error: threadsError } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (threadsError) throw threadsError;

  const loadedThreads = await Promise.all(threads.map(async (thread) => {
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return {
      id: thread.id,
      title: thread.title,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        model: msg.model,
        input_tokens: msg.input_tokens,
        output_tokens: msg.output_tokens,
        tenXCost: msg["10x_cost"],
        summary: msg.summary,
        keyInfo: msg.key_info as unknown as KeyInfo | undefined
      })),
      lastUpdated: new Date(thread.updated_at),
      hidden: thread.hidden,
      system_prompt: thread.system_prompt,
      project_id: thread.project_id
    };
  }));

  return loadedThreads;
};
