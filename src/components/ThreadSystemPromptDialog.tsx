
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/contexts/ChatContext';

interface ThreadSystemPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (systemPrompt: string) => void;
  initialPrompt: string;
  title?: string;
  description?: string;
}

export function ThreadSystemPromptDialog({
  isOpen,
  onClose,
  onSave,
  initialPrompt,
  title = "Edit System Prompt",
  description = "The system prompt provides instructions to the AI for this specific conversation."
}: ThreadSystemPromptDialogProps) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [projectSystemPrompt, setProjectSystemPrompt] = useState('');
  const { currentThread } = useChat();
  
  // When the dialog opens, set the initial value
  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(initialPrompt || '');
      
      // Fetch project system prompt if the thread is part of a project
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
  };

  // Reset state when dialog closes to prevent memory leaks
  const handleClose = () => {
    // First call the parent's onClose
    onClose();
    // Reset state after a small delay to prevent UI flicker
    setTimeout(() => {
      setSystemPrompt('');
      setProjectSystemPrompt('');
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="text-gray-300">{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="py-4">
          {projectSystemPrompt && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 text-gray-300">Project System Prompt:</h4>
              <div className="bg-gray-700 p-3 rounded text-sm text-gray-300 max-h-[100px] overflow-y-auto">
                {projectSystemPrompt}
              </div>
            </div>
          )}
          
          <Textarea
            placeholder="Enter system instructions for the AI..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[150px] bg-gray-700 text-white"
          />
          
          {projectSystemPrompt && (
            <div className="mt-3 text-xs text-gray-400">
              <strong>Note:</strong> This thread's system prompt will be combined with the project's system prompt.
            </div>
          )}
          
          <div className="text-xs text-gray-400 mt-2">
            {projectSystemPrompt 
              ? "When this thread is used, both prompts will be sent to the AI in this order: project prompt first, then thread prompt."
              : "System prompts help define the AI's behavior, knowledge, and tone."}
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={handleClose} className="bg-gray-700 h-9">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-9">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
