
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { Project } from '@/types/chat';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit, 
  Eye, 
  EyeOff, 
  MoreVertical 
} from 'lucide-react';
import { ProjectDialog } from './ProjectDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from './ui/input';
import { ProjectThread } from './ProjectThread';

interface ProjectListProps {
  onCreateThreadInProject: (projectId: string) => void;
}

export function ProjectList({ onCreateThreadInProject }: ProjectListProps) {
  const { 
    projects, 
    threads, 
    currentThread, 
    updateProject,
    hideProject,
    unhideProject
  } = useChat();
  
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editableProject, setEditableProject] = useState<Project | null>(null);
  const [editableProjectId, setEditableProjectId] = useState<string | null>(null);
  const [editedProjectName, setEditedProjectName] = useState('');
  
  // Expand/collapse project
  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };
  
  // Open project dialog for editing
  const openEditProjectDialog = (project: Project) => {
    setEditableProject(project);
    setIsProjectDialogOpen(true);
  };
  
  // Handle project edit/save
  const handleProjectSave = (name: string, systemPrompt: string) => {
    if (editableProject) {
      updateProject(editableProject.id, {
        name,
        system_prompt: systemPrompt
      });
    }
    setIsProjectDialogOpen(false);
    setEditableProject(null);
  };
  
  // Handle project name edit
  const handleProjectNameEdit = (project: Project) => {
    setEditableProjectId(project.id);
    setEditedProjectName(project.name);
  };
  
  // Save edited project name
  const saveProjectName = (projectId: string) => {
    if (editedProjectName.trim()) {
      updateProject(projectId, { name: editedProjectName });
    }
    setEditableProjectId(null);
  };
  
  // Toggle project visibility
  const toggleProjectVisibility = (project: Project) => {
    if (project.hidden) {
      unhideProject(project.id);
    } else {
      hideProject(project.id);
    }
  };
  
  // Filter visible projects
  const visibleProjects = projects.filter(project => !project.hidden);
  
  return (
    <div className="mb-4">
      {visibleProjects.map((project) => {
        // Get threads that belong to this project
        const projectThreads = threads.filter(thread => thread.project_id === project.id && !thread.hidden);
        
        return (
          <div key={project.id} className="mb-2">
            {editableProjectId !== project.id ? (
              <div className="flex items-center justify-between group px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center p-2 text-white hover:bg-[#FFFFFF]/10 flex-1"
                  onClick={() => toggleProjectExpand(project.id)}
                >
                  {expandedProjects[project.id] ? 
                    <ChevronDown className="h-4 w-4 min-w-4 mr-2" /> : 
                    <ChevronRight className="h-4 w-4 min-w-4 mr-2" />
                  }
                  <span className="font-semibold truncate max-w-[120px] text-left">{project.name}</span>
                  <span className="text-xs text-gray-400 ml-1 whitespace-nowrap">({projectThreads.length})</span>
                </Button>
                
                <div className="flex items-center">
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-1 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateThreadInProject(project.id);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-1 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 text-white">
                      <DropdownMenuItem onClick={() => handleProjectNameEdit(project)}>
                        <Edit className="w-4 h-4 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditProjectDialog(project)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit System Prompt
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleProjectVisibility(project)}>
                        <EyeOff className="w-4 h-4 mr-2" /> Hide Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <div className="flex items-center px-1">
                <Input
                  value={editedProjectName}
                  onChange={(e) => setEditedProjectName(e.target.value)}
                  onBlur={() => saveProjectName(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveProjectName(project.id);
                    if (e.key === 'Escape') setEditableProjectId(null);
                  }}
                  className="text-sm bg-white text-black h-8"
                  autoFocus
                />
              </div>
            )}
            
            {expandedProjects[project.id] && (
              <div className="pl-6 mt-1 space-y-1">
                {projectThreads.length > 0 ? (
                  projectThreads.map(thread => (
                    <ProjectThread
                      key={thread.id}
                      thread={thread}
                      currentThreadId={currentThread?.id}
                    />
                  ))
                ) : (
                  <div className="text-sm text-gray-400 py-1">No threads</div>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      <ProjectDialog
        isOpen={isProjectDialogOpen}
        onClose={() => {
          setIsProjectDialogOpen(false);
          setEditableProject(null);
        }}
        onSave={handleProjectSave}
        project={editableProject}
      />
    </div>
  );
}
