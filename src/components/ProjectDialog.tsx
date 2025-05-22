
import React, { useState, useEffect } from 'react';
import { Project } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, systemPrompt: string) => void;
  project: Project | null;
}

export function ProjectDialog({ isOpen, onClose, onSave, project }: ProjectDialogProps) {
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // When a project is provided for editing, populate the fields
  useEffect(() => {
    if (project) {
      setName(project.name);
      setSystemPrompt(project.system_prompt || '');
    } else {
      setName('');
      setSystemPrompt('');
    }
  }, [project, isOpen]);
  
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), systemPrompt.trim());
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-name" className="text-right">
              Name
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Enter project name"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="system-prompt" className="text-right align-top mt-2">
              System Prompt
            </Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="col-span-3"
              placeholder="Enter a system prompt for all threads in this project (optional)"
              rows={5}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {project ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
