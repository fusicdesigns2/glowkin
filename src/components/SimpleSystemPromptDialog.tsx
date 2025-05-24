
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/contexts/ChatContext';

interface SimpleSystemPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (systemPrompt: string) => void;
  initialPrompt: string;
  title?: string;
  description?: string;
}

export function SimpleSystemPromptDialog({
  isOpen,
  onClose,
  onSave,
  initialPrompt,
  title = "Edit System Prompt",
  description = "The system prompt provides instructions to the AI for this specific conversation."
}: SimpleSystemPromptDialogProps) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [projectSystemPrompt, setProjectSystemPrompt] = useState('');
  const { currentThread } = useChat();
  
  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(initialPrompt || '');
      
      if (currentThread?.project_id) {
        const fetchProjectPrompt = async () => {
          try {
            const { data, error } = await supabase
              .from('projects')
              .select('system_prompt')
              .eq('id', currentThread.project_id)
              .single();
              
            if (error) throw error;
            
            if (data && data.system_prompt) {
              setProjectSystemPrompt(data.system_prompt);
            } else {
              setProjectSystemPrompt('');
            }
          } catch (err) {
            console.error('Error fetching project system prompt:', err);
            setProjectSystemPrompt('');
          }
        };
        
        fetchProjectPrompt();
      } else {
        setProjectSystemPrompt('');
      }
    }
  }, [isOpen, initialPrompt, currentThread]);
  
  const handleSave = () => {
    onSave(systemPrompt.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-800 text-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-gray-300 mt-1">{description}</p>}
        </div>
        
        <div className="space-y-4">
          {projectSystemPrompt && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-300">Project System Prompt:</h4>
              <div className="bg-gray-700 p-3 rounded text-sm text-gray-300 max-h-[100px] overflow-y-auto">
                {projectSystemPrompt}
              </div>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              {projectSystemPrompt ? 'Thread System Prompt:' : 'System Prompt:'}
            </label>
            <Textarea
              placeholder="Enter system instructions for the AI..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[150px] bg-gray-700 text-white border-gray-600"
            />
          </div>
          
          {projectSystemPrompt && (
            <div className="text-xs text-gray-400">
              <strong>Note:</strong> This thread's system prompt will be combined with the project's system prompt.
              <br />
              When this thread is used, both prompts will be sent to the AI in this order: project prompt first, then thread prompt.
            </div>
          )}
          
          {!projectSystemPrompt && (
            <div className="text-xs text-gray-400">
              System prompts help define the AI's behavior, knowledge, and tone.
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
