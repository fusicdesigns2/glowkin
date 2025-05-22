
import { useState } from 'react';
import { Thread } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createThread } from '@/utils/chatUtils';

export const useThreadOperations = (
  userId: string | undefined,
  threads: Thread[],
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>,
  setCurrentThread: React.Dispatch<React.SetStateAction<Thread | null>>,
  currentThread: Thread | null
) => {
  // Create a new thread
  const createNewThread = async () => {
    if (!userId) return null;
    
    try {
      const threadId = await createThread(userId, `New Chat ${threads.length + 1}`);
      const newThread: Thread = {
        id: threadId,
        title: `New Chat ${threads.length + 1}`,
        messages: [],
        lastUpdated: new Date(),
        hidden: false,
      };
      
      setThreads([newThread, ...threads]);
      setCurrentThread(newThread);
      return newThread;
    } catch (error) {
      console.error('Failed to create thread:', error);
      toast.error('Failed to create new chat');
      return null;
    }
  };

  // Select a thread
  const selectThread = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setCurrentThread(thread);
      return thread;
    }
    return null;
  };

  // Update thread in list
  const updateThreadInList = (threadId: string, updates: Partial<Thread>) => {
    const updatedThreads = threads.map(thread => 
      thread.id === threadId ? { ...thread, ...updates } : thread
    );
    
    setThreads(updatedThreads);
    
    if (currentThread && currentThread.id === threadId) {
      setCurrentThread({ ...currentThread, ...updates });
    }
  };

  // Hide thread
  const hideThread = async (threadId: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: true })
        .eq('id', threadId);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => 
        thread.id === threadId ? { ...thread, hidden: true } : thread
      );
      setThreads(updatedThreads);
      
      // If the hidden thread was the current one, select another non-hidden thread
      if (currentThread?.id === threadId) {
        const nextVisibleThread = updatedThreads.find(t => !t.hidden);
        if (nextVisibleThread) {
          setCurrentThread(nextVisibleThread);
        } else {
          // If all threads are hidden, create a new one
          createNewThread();
        }
      }
      
      toast.success("Thread hidden");
    } catch (error) {
      console.error('Error hiding thread:', error);
      toast.error("Failed to hide thread");
    }
  };
  
  // Unhide thread
  const unhideThread = async (threadId: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: false })
        .eq('id', threadId);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => 
        thread.id === threadId ? { ...thread, hidden: false } : thread
      );
      setThreads(updatedThreads);
      
      toast.success("Thread unhidden");
    } catch (error) {
      console.error('Error unhiding thread:', error);
      toast.error("Failed to unhide thread");
    }
  };
  
  // Show all hidden threads
  const showAllHiddenThreads = async () => {
    try {
      if (!userId) return;
      
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: false })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => ({ ...thread, hidden: false }));
      setThreads(updatedThreads);
      
      toast.success("All threads unhidden");
    } catch (error) {
      console.error('Error unhiding all threads:', error);
      toast.error("Failed to unhide threads");
    }
  };
  
  // Hide all threads
  const hideAllThreads = async () => {
    if (!userId) return;
    
    try {
      // First create a new thread to avoid having all threads hidden
      const newThread = await createNewThread();
      if (!newThread) return;
      
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ hidden: true })
        .eq('user_id', userId)
        .neq('id', newThread.id);
      
      if (error) throw error;
      
      // Update in state
      const updatedThreads = threads.map(thread => 
        thread.id !== newThread.id ? { ...thread, hidden: true } : thread
      );
      setThreads(updatedThreads);
      
      toast.success("All previous threads hidden");
    } catch (error) {
      console.error('Error hiding all threads:', error);
      toast.error("Failed to hide threads");
    }
  };

  // Update thread system prompt
  const updateThreadSystemPrompt = async (threadId: string, systemPrompt: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('chat_threads')
        .update({ system_prompt: systemPrompt })
        .eq('id', threadId);
      
      if (error) throw error;
      
      // Update in state
      setThreads(prevThreads => 
        prevThreads.map(thread => 
          thread.id === threadId ? { ...thread, system_prompt: systemPrompt } : thread
        )
      );
      
      if (currentThread && currentThread.id === threadId) {
        setCurrentThread({ ...currentThread, system_prompt: systemPrompt });
      }
      
    } catch (error) {
      console.error('Error updating system prompt:', error);
      toast.error("Failed to save system prompt");
    }
  };

  return {
    createNewThread,
    selectThread,
    updateThreadInList,
    hideThread,
    unhideThread,
    showAllHiddenThreads,
    hideAllThreads,
    updateThreadSystemPrompt
  };
};
