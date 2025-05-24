
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
  MoreVertical,
  FolderPlus 
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
    unhideProject,
    createProject
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

  // Open project dialog for creating
  const openCreateProjectDialog = () => {
    setEditableProject(null);
    setIsProjectDialogOpen(true);
  };
  
  // Handle project edit/save
  const handleProjectSave = async (name: string, systemPrompt: string) => {
    if (editableProject) {
      updateProject(editableProject.id, {
        name,
        system_prompt: systemPrompt
      });
    } else {
      // Create new project
      await createProject(name, systemPrompt);
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
      {/* Header with create project button */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-semibold text-gray-300">Projects</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 text-gray-400 hover:text-white hover:bg-[#FFFFFF]/10"
          onClick={openCreateProjectDialog}
          title="Create new project"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

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
                  className="flex items-center p-2 text-white hover:bg-[#FFFFFF]/10"
                  onClick={() => toggleProjectExpand(project.id)}
                  style={{ maxWidth: 'calc(100% - 40px)', flex: '1' }}
                >
                  <span className="flex-shrink-0 mr-2">
                    {expandedProjects[project.id] ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </span>
                  <span className="font-semibold truncate text-left flex-1">{project.name}</span>
                  <span className="text-xs text-gray-400 ml-1 whitespace-nowrap flex-shrink-0">({projectThreads.length})</span>
                </Button>
                
                <div className="flex items-center ml-1 flex-shrink-0">
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
