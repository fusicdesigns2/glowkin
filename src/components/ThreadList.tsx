
import React from 'react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';

export default function ThreadList() {
  const { threads, currentThread, selectThread, createThread } = useChat();
  
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
                <Button
                  key={thread.id}
                  variant="ghost"
                  className={`w-full justify-start text-left truncate ${
                    currentThread?.id === thread.id 
                      ? 'bg-gray-100 font-medium' 
                      : ''
                  }`}
                  onClick={() => selectThread(thread.id)}
                >
                  <span className="truncate">{thread.title}</span>
                </Button>
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
