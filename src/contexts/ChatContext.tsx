
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Thread, ChatMessage, ChatContextType, Project } from '@/types/chat';
import { ChatContextProviderProps } from './ChatContextTypes';
import { useAuth } from './AuthContext';
import { loadThreadsFromDB, getMessageCostEstimate } from '@/utils/chatUtils';
import { useThreadOperations } from '@/hooks/useThreadOperations';
import { useProjectOperations } from '@/hooks/useProjectOperations';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useFunFacts } from '@/hooks/useFunFacts';
import { calculateImageCost } from '@/utils/imageUtils';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: ChatContextProviderProps) => {
  // Auth context
  const { user, profile, updateCredits, isLoading: authLoading } = useAuth();
  
  // State variables
  const [threads, setThreads] = useState<Thread[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [threadModels, setThreadModels] = useState<Record<string, string>>({});
  
  // Custom hooks
  const { funFacts, currentFunFact, refreshFunFact } = useFunFacts();
  
  const threadOps = useThreadOperations(
    user?.id,
    threads,
    setThreads,
    setCurrentThread,
    currentThread
  );

  const projectOps = useProjectOperations(
    user?.id,
    projects,
    setProjects
  );
  
  const messageHandling = useMessageHandling(
    threads,
    setThreads,
    currentThread,
    setCurrentThread,
    setIsLoading,
    refreshFunFact,
    threadModels,
    selectedModel,
    threadOps.createNewThread,
    updateCredits,
    user?.id,
    profile?.credits
  );
  
  // Load threads and projects on user login
  useEffect(() => {
    if (!user) {
      setThreads([]);
      setProjects([]);
      setCurrentThread(null);
      return;
    }

    const loadThreads = async () => {
      try {
        const loadedThreads = await loadThreadsFromDB(user.id);
        setThreads(loadedThreads);
        if (loadedThreads.length > 0) {
          setCurrentThread(loadedThreads[0]);
        }
      } catch (error) {
        console.error('Failed to load threads:', error);
      }
    };

    const loadProjectsFromDB = async (userId: string) => {
      try {
        const { data: projectsData, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Convert data to proper Project type objects
        const loadedProjects: Project[] = projectsData.map(project => ({
          id: project.id,
          name: project.name,
          system_prompt: project.system_prompt,
          hidden: project.hidden,
          context_data: Array.isArray(project.context_data) ? project.context_data : [],
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at)
        }));

        setProjects(loadedProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };

    loadThreads();
    loadProjectsFromDB(user.id);
  }, [user]);

  // Set model for the current thread
  const setSelectedModelForThread = (model: string) => {
    setSelectedModel(model);
    
    if (currentThread) {
      setThreadModels(prev => ({
        ...prev,
        [currentThread.id]: model
      }));
    }
  };

  // Create thread in project
  const createThreadInProject = async (projectId: string) => {
    return projectOps.createThreadInProject(projectId, threadOps.createNewThread, threadOps.updateThreadInList);
  };

  // Move thread to project
  const moveThreadToProject = async (threadId: string, projectId: string) => {
    return projectOps.moveThreadToProject(threadId, projectId, threadOps.updateThreadInList);
  };

  // Context value
  const value: ChatContextType = {
    threads,
    projects,
    currentThread,
    isLoading,
    createThread: threadOps.createNewThread,
    createProject: projectOps.createProject,
    selectThread: threadOps.selectThread,
    sendMessage: messageHandling.sendMessage,
    getMessageCostEstimate,
    funFacts,
    currentFunFact,
    refreshFunFact,
    updateThreadInList: threadOps.updateThreadInList,
    updateProject: projectOps.updateProject,
    setSelectedModel: setSelectedModelForThread,
    hideThread: threadOps.hideThread,
    unhideThread: threadOps.unhideThread,
    showAllHiddenThreads: threadOps.showAllHiddenThreads,
    hideAllThreads: threadOps.hideAllThreads,
    hideProject: projectOps.hideProject,
    unhideProject: projectOps.unhideProject,
    updateThreadSystemPrompt: threadOps.updateThreadSystemPrompt,
    createThreadInProject,
    moveThreadToProject
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
      
      {/* Error Dialog for when image generation fails */}
      <AlertDialog open={messageHandling.errorDialogOpen} onOpenChange={messageHandling.setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Images Not Yet Supported</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 text-center">
                <p>Images are not yet supported. We are working on it.</p>
                <p>Let us know at <a href="https://facebook.com/chat-ai-box" className="text-blue-500 underline">facebook.com/chat-ai-box</a> that you'd love images and maybe we can give you an update.</p>
                <p className="mt-4 font-semibold">Thank you for your support!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Image Generation Confirmation Dialog */}
      <ConfirmDialog
        open={messageHandling.imageConfirmOpen}
        onOpenChange={messageHandling.setImageConfirmOpen}
        title="Generate an Image?"
        description={`This appears to be an image generation request. Would you like to generate an image using DALL-E 3? This will cost approximately ${calculateImageCost} credits.`}
        confirmText="Yes, Generate Image"
        cancelText="No, Just Answer"
        onConfirm={messageHandling.handleImageGeneration}
        onCancel={messageHandling.handleCancelImageGeneration}
      />
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
