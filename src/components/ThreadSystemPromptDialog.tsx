
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
  
  // When the dialog opens, set the initial value
  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(initialPrompt || '');
    }
  }, [isOpen, initialPrompt]);
  
  const handleSave = () => {
    onSave(systemPrompt.trim());
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            placeholder="Enter system instructions for the AI..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[150px]"
          />
          <p className="text-xs text-gray-500 mt-2">
            System prompts help define the AI's behavior, knowledge, and tone.
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
