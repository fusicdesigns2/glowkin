
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ThreadList() {
  const { threads, currentThread, selectThread, createThread } = useChat();
  const [editableThreadId, setEditableThreadId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

  const updateThreadTitle = async (threadId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ title: newTitle })
        .eq('id', threadId);

      if (error) throw error;
      setEditableThreadId(null);
    } catch (error) {
      console.error('Error updating thread title:', error);
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
    <div className="w-64 bg-white border-r border-gray-200 h-[80vh] flex flex-col">
      <div className="p-4 border-b">
        <Button 
          onClick={createThread} 
          className="w-full bg-maiRed hover:bg-red-600 text-white"
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
                  {editableThreadId === thread.id ? (
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onBlur={() => updateThreadTitle(thread.id, editedTitle)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateThreadTitle(thread.id, editedTitle);
                        }
                      }}
                      className="text-sm"
                      autoFocus
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left truncate ${
                        currentThread?.id === thread.id 
                          ? 'bg-gray-100 font-medium' 
                          : ''
                      }`}
                      onClick={() => selectThread(thread.id)}
                    >
                      <span className="truncate">{thread.title}</span>
                      <Edit 
                        className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTitleClick(thread);
                        }}
                      />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              No chat threads yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
