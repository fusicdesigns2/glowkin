
import { useState } from 'react';
import { Project } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useProjectOperations = (
  userId: string | undefined,
  projects: Project[],
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
) => {
  // Create a new project
  const createProject = async (name: string, systemPrompt?: string): Promise<string | null> => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name,
          system_prompt: systemPrompt || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newProject: Project = {
        id: data.id,
        name: data.name,
        system_prompt: data.system_prompt,
        hidden: data.hidden,
        context_data: data.context_data || [],
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      };
      
      setProjects(prevProjects => [newProject, ...prevProjects]);
      toast.success('Project created successfully');
      return data.id;
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  // Update project
  const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
    try {
      const updateData: any = { ...updates };
      
      // Convert Date objects to strings for the database
      if (updates.created_at) updateData.created_at = updates.created_at.toISOString();
      if (updates.updated_at) updateData.updated_at = updates.updated_at.toISOString();
      
      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);
      
      if (error) throw error;
      
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId ? { ...project, ...updates } : project
        )
      );
      
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project');
    }
  };

  // Hide project
  const hideProject = async (projectId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ hidden: true })
        .eq('id', projectId);
      
      if (error) throw error;
      
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId ? { ...project, hidden: true } : project
        )
      );
      
      toast.success('Project hidden successfully');
    } catch (error) {
      console.error('Failed to hide project:', error);
      toast.error('Failed to hide project');
    }
  };

  // Unhide project
  const unhideProject = async (projectId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ hidden: false })
        .eq('id', projectId);
      
      if (error) throw error;
      
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId ? { ...project, hidden: false } : project
        )
      );
      
      toast.success('Project unhidden successfully');
    } catch (error) {
      console.error('Failed to unhide project:', error);
      toast.error('Failed to unhide project');
    }
  };

  // Create thread in project
  const createThreadInProject = async (
    projectId: string,
    createThread: () => any,
    updateThreadInList: (threadId: string, updates: any) => void
  ): Promise<void> => {
    try {
      // First create a new thread
      const newThread = await createThread();
      
      if (!newThread) {
        throw new Error('Failed to create thread');
      }
      
      // Then update it to be part of the project
      const { error } = await supabase
        .from('chat_threads')
        .update({ project_id: projectId })
        .eq('id', newThread.id);
      
      if (error) throw error;
      
      // Update the thread in the local state
      updateThreadInList(newThread.id, { project_id: projectId });
      
      toast.success('Thread created in project');
    } catch (error) {
      console.error('Failed to create thread in project:', error);
      toast.error('Failed to create thread in project');
    }
  };

  // Move thread to project
  const moveThreadToProject = async (
    threadId: string,
    projectId: string,
    updateThreadInList: (threadId: string, updates: any) => void
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ project_id: projectId })
        .eq('id', threadId);
      
      if (error) throw error;
      
      // Update the thread in the local state
      updateThreadInList(threadId, { project_id: projectId });
      
      toast.success('Thread moved to project');
    } catch (error) {
      console.error('Failed to move thread to project:', error);
      toast.error('Failed to move thread to project');
    }
  };

  return {
    createProject,
    updateProject,
    hideProject,
    unhideProject,
    createThreadInProject,
    moveThreadToProject
  };
};
