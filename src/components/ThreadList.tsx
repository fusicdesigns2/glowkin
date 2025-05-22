
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Eye, EyeOff, ListFilter, MoveRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Thread, Project } from '@/types/chat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProjectList } from './ProjectList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ThreadSystemPromptDialog } from './ThreadSystemPromptDialog';

export default function ThreadList() {
  const { 
    threads, 
    projects,
    currentThread, 
    selectThread, 
    createThread, 
    updateThreadInList,
    hideThread,
    unhideThread,
    showAllHiddenThreads,
    hideAllThreads,
    moveThreadToProject,
    updateThreadSystemPrompt
  } = useChat();
  
  const [editableThreadId, setEditableThreadId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [showHiddenThreads, setShowHiddenThreads] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [threadToMove, setThreadToMove] = useState<string | null>(null);
  const [isSystemPromptDialogOpen, setIsSystemPromptDialogOpen] = useState(false);
  const [threadForSystemPrompt, setThreadForSystemPrompt] = useState<string | null>(null);
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [newThreadProjectId, setNewThreadProjectId] = useState<string | undefined>(undefined);
  
  // Filter standalone threads (not connected to any project)
  const standaloneThreads = threads.filter(thread => !thread.project_id && (!thread.hidden || showHiddenThreads));

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
      
      // Update the thread in the context
      updateThreadInList(threadId, { title: newTitle });
      
      setEditableThreadId(null);
      toast.success("Thread title updated");
    } catch (error) {
      console.error('Error updating thread title:', error);
      toast.error("Failed to update thread title");
    }
  };

  const handleTitleClick = (thread: { id: string; title: string }) => {
    setEditableThreadId(thread.id);
    setEditedTitle(thread.title);
  };

  const toggleThreadVisibility = (thread: Thread) => {
    if (thread.hidden) {
      unhideThread(thread.id);
    } else {
      hideThread(thread.id);
    }
  };

  const handleShowHiddenChange = (checked: boolean) => {
    setShowHiddenThreads(checked);
  };

  const openMoveThreadDialog = (threadId: string) => {
    setThreadToMove(threadId);
    setIsMoveDialogOpen(true);
  };

  const openSystemPromptDialog = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setThreadForSystemPrompt(threadId);
      setIsSystemPromptDialogOpen(true);
    }
  };

  const handleMoveThread = async (projectId: string) => {
    if (threadToMove) {
      await moveThreadToProject(threadToMove, projectId);
      setIsMoveDialogOpen(false);
      setThreadToMove(null);
    }
  };

  const handleSaveSystemPrompt = async (systemPrompt: string) => {
    if (threadForSystemPrompt) {
      await updateThreadSystemPrompt(threadForSystemPrompt, systemPrompt);
      setIsSystemPromptDialogOpen(false);
      setThreadForSystemPrompt(null);
    }
  };

  const handleCreateThread = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsNewThreadDialogOpen(true);
  };

  const handleCreateThreadInProject = async (projectId: string) => {
    setNewThreadProjectId(projectId);
    setIsNewThreadDialogOpen(true);
  };

  const handleNewThreadWithPrompt = async (systemPrompt: string) => {
    const thread = await createThread(newThreadProjectId);
    if (thread && systemPrompt) {
      await updateThreadSystemPrompt(thread.id, systemPrompt);
    }
    setIsNewThreadDialogOpen(false);
    setNewThreadProjectId(undefined);
  };

  useEffect(() => {
    // Update title when current thread changes
    if (currentThread && currentThread.messages.length > 0) {
      const firstMessage = currentThread.messages[0];
      if (firstMessage.role === 'user') {
        const firstLine = firstMessage.content.split('\n')[0];
        const truncatedTitle = firstLine.length > 30 ? 
          firstLine.substring(0, 27) + '...' : 
          firstLine;
        updateThreadTitle(currentThread.id, truncatedTitle);
      }
    }
  }, [currentThread?.messages[0]?.content]);

  return (
    <div className="w-64 bg-[#403E43] text-white border-r border-gray-700 h-[80vh] flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleCreateThread} 
            className="w-full bg-maiGold hover:bg-maiGold/80 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full">
                <ListFilter className="w-4 h-4 mr-2" /> Thread Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => showAllHiddenThreads()}>
                <Eye className="w-4 h-4 mr-2" /> Show All Hidden Threads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => hideAllThreads()}>
                <EyeOff className="w-4 h-4 mr-2" /> Hide All Threads
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center space-x-2">
            <Switch 
              id="show-hidden" 
              checked={showHiddenThreads} 
              onCheckedChange={handleShowHiddenChange}
            />
            <Label htmlFor="show-hidden" className="text-sm">Show Hidden Threads</Label>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-grow">
        <div className="p-2">
          {/* Display projects and their threads */}
          <ProjectList onCreateThreadInProject={handleCreateThreadInProject} />
          
          {/* Display standalone threads (not in any project) */}
          <h2 className="text-md font-semibold text-white px-2 py-2 flex justify-between items-center">
            Threads
          </h2>
          {standaloneThreads.length > 0 ? (
            <div className="space-y-1">
              {standaloneThreads.map(thread => (
                <div key={thread.id} className="flex items-center group">
                  {editableThreadId !== thread.id ? (
                    <div className="flex items-center justify-between w-full">
                      <Button
                        variant="ghost"
                        className={`flex-grow justify-start text-left truncate text-white ${
                          currentThread?.id === thread.id 
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
                            <button
                              type="button"
                              className="p-1 hover:bg-[#FFFFFF]/20 hover:scale-105 rounded-full transition-all duration-200 text-white"
                              aria-label="Thread options"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleTitleClick(thread);
                            }}>
                              <Edit className="w-4 h-4 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openSystemPromptDialog(thread.id);
                            }}>
                              <Edit className="w-4 h-4 mr-2" /> Edit System Prompt
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              toggleThreadVisibility(thread);
                            }}>
                              {thread.hidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                              {thread.hidden ? 'Show Thread' : 'Hide Thread'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openMoveThreadDialog(thread.id);
                            }}>
                              <MoveRight className="w-4 h-4 mr-2" /> Move to Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ) : (
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onBlur={() => {
                        if (editedTitle.trim() !== thread.title) {
                          updateThreadTitle(thread.id, editedTitle);
                        } else {
                          setEditableThreadId(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editedTitle.trim() !== thread.title) {
                            updateThreadTitle(thread.id, editedTitle);
                          } else {
                            setEditableThreadId(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditableThreadId(null);
                        }
                      }}
                      className="text-sm w-48 bg-white text-black"
                      autoFocus
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-300 text-sm">
              No standalone threads
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Move Thread Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Thread to Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {projects.filter(project => !project.hidden).length > 0 ? (
                projects
                  .filter(project => !project.hidden)
                  .map((project) => (
                    <Button
                      key={project.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleMoveThread(project.id)}
                    >
                      {project.name}
                    </Button>
                  ))
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  No projects available. Create a project first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsMoveDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thread System Prompt Dialog */}
      <ThreadSystemPromptDialog
        isOpen={isSystemPromptDialogOpen}
        onClose={() => setIsSystemPromptDialogOpen(false)}
        onSave={handleSaveSystemPrompt}
        initialPrompt={threads.find(t => t.id === threadForSystemPrompt)?.system_prompt || ''}
      />

      {/* New Thread with System Prompt Dialog */}
      <ThreadSystemPromptDialog
        isOpen={isNewThreadDialogOpen}
        onClose={() => {
          setIsNewThreadDialogOpen(false);
          setNewThreadProjectId(undefined);
        }}
        onSave={handleNewThreadWithPrompt}
        initialPrompt=""
        title="New Thread System Prompt"
        description="Provide a system prompt for the new thread (optional)"
      />
    </div>
  );
}
