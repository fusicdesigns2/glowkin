
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/contexts/ChatContext';

interface ProjectThreadSystemPromptProps {
  threadId: string;
}

export default function ProjectThreadSystemPrompt({ threadId }: ProjectThreadSystemPromptProps) {
  const [projectPrompt, setProjectPrompt] = useState<string>('');
  const [threadPrompt, setThreadPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { threads } = useChat();
  
  useEffect(() => {
    const fetchSystemPrompts = async () => {
      setIsLoading(true);
      try {
        const thread = threads.find(t => t.id === threadId);
        if (!thread) {
          setIsLoading(false);
          return;
        }
        
        setThreadPrompt(thread.system_prompt || '');
        
        if (thread.project_id) {
          const { data, error } = await supabase
            .from('projects')
            .select('system_prompt')
            .eq('id', thread.project_id)
            .maybeSingle();
            
          if (error) throw error;
          
          if (data && data.system_prompt) {
            setProjectPrompt(data.system_prompt);
          } else {
            setProjectPrompt('');
          }
        } else {
          setProjectPrompt('');
        }
      } catch (err) {
        console.error('Error fetching system prompts:', err);
        setProjectPrompt('');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSystemPrompts();
  }, [threadId, threads]);
  
  if (isLoading) {
    return <div className="text-xs text-gray-400">Loading system prompts...</div>;
  }
  
  if (!projectPrompt && !threadPrompt) {
    return <p className="text-xs text-gray-400">No system prompts configured.</p>;
  }
  
  return (
    <div className="space-y-2">
      {projectPrompt && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400">Project prompt:</p>
          <p className="text-xs text-gray-300">{projectPrompt}</p>
        </div>
      )}
      
      {threadPrompt && (
        <div className="space-y-1 mt-2">
          <p className="text-xs text-gray-400">Thread prompt:</p>
          <p className="text-xs text-gray-300">{threadPrompt}</p>
        </div>
      )}
      
      {projectPrompt && threadPrompt && (
        <div className="text-xs text-gray-400 pt-1">
          <p>These prompts are combined when the AI processes messages.</p>
        </div>
      )}
    </div>
  );
}
