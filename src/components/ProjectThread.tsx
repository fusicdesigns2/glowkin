
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Thread } from '@/types/chat';
import { Edit, Eye, EyeOff, MoveRight, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectThreadProps {
  thread: Thread;
  currentThreadId: string | undefined;
  onEditSystemPrompt: (threadId: string) => void;
  onMoveThread: (threadId: string) => void;
}

export function ProjectThread({
  thread,
  currentThreadId,
  onEditSystemPrompt,
  onMoveThread
}: ProjectThreadProps) {
  const { 
    selectThread, 
    hideThread, 
    unhideThread, 
    updateThreadInList
  } = useChat();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(thread.title);

  const updateThreadTitle = async (threadId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      toast.error("Thread title cannot be empty");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ title: newTitle })
        .eq('id', threadId);

      if (error) throw error;
      
      updateThreadInList(threadId, { title: newTitle });
      
      setIsEditing(false);
      toast.success("Thread title updated");
    } catch (error) {
      console.error('Error updating thread title:', error);
      toast.error("Failed to update thread title");
    }
  };

  const toggleThreadVisibility = () => {
    if (thread.hidden) {
      unhideThread(thread.id);
    } else {
      hideThread(thread.id);
    }
  };

  const handleTitleClick = () => {
    setIsEditing(true);
    setEditedTitle(thread.title);
  };

  const handleSystemPromptEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditSystemPrompt(thread.id);
  };

  const handleMoveThread = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveThread(thread.id);
  };

  const handleRemoveFromProject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ project_id: null })
        .eq('id', thread.id);
      
      if (error) throw error;
      
      updateThreadInList(thread.id, { project_id: null });
      
      toast.success('Thread removed from project');
    } catch (error) {
      console.error('Failed to remove thread from project:', error);
      toast.error('Failed to remove thread from project');
    }
  };

  return (
    <div className="flex items-center group">
      {isEditing ? (
        <Input
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onBlur={() => {
            if (editedTitle.trim() !== thread.title) {
              updateThreadTitle(thread.id, editedTitle);
            } else {
              setIsEditing(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (editedTitle.trim() !== thread.title) {
                updateThreadTitle(thread.id, editedTitle);
              } else {
                setIsEditing(false);
              }
            } else if (e.key === 'Escape') {
              setIsEditing(false);
            }
          }}
          className="text-sm w-48 bg-white text-black"
          autoFocus
        />
      ) : (
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            className={`flex-grow justify-start text-left truncate text-white ${
              currentThreadId === thread.id 
                ? 'bg-[#FFFFFF]/20 font-bold' 
                : 'hover:bg-[#FFFFFF]/10'
            } ${thread.hidden ? 'opacity-50' : ''}`}
            onClick={() => selectThread(thread.id)}
          >
            <span className="truncate w-32">{thread.title}</span>
          </Button>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 text-white">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleTitleClick();
                }}>
                  <Edit className="w-4 h-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSystemPromptEdit}>
                  <Edit className="w-4 h-4 mr-2" /> Edit System Prompt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  toggleThreadVisibility();
                }}>
                  {thread.hidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                  {thread.hidden ? 'Show Thread' : 'Hide Thread'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMoveThread}>
                  <MoveRight className="w-4 h-4 mr-2" /> Move to Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRemoveFromProject}>
                  <X className="w-4 h-4 mr-2" /> Remove from Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
}
