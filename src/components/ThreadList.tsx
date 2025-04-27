import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ThreadList() {
  const { threads, currentThread, selectThread, createThread, updateThreadInList } = useChat();
  const [editableThreadId, setEditableThreadId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

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
        <Button 
          onClick={createThread} 
          className="w-full bg-maiGold hover:bg-maiGold/80 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-grow">
        <div className="p-2">
          {threads.length > 0 ? (
            <div className="space-y-1">
              {threads.map(thread => (
                <div key={thread.id} className="flex items-center group">
                  {editableThreadId !== thread.id ? (
                    <div className="flex items-center justify-between w-full">
                      <Button
                        variant="ghost"
                        className={`flex-grow justify-start text-left truncate text-white ${
                          currentThread?.id === thread.id 
                            ? 'bg-[#FFFFFF]/20 font-bold' 
                            : 'hover:bg-[#FFFFFF]/10'
                        }`}
                        onClick={() => selectThread(thread.id)}
                      >
                        <span className="truncate w-32">{thread.title}</span>
                      </Button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTitleClick(thread);
                        }}
                        className="p-1 hover:bg-[#FFFFFF]/20 hover:scale-105 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 text-white"
                        aria-label="Edit thread title"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
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
              No chat threads yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
