
import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Project } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit, 
  Eye, 
  EyeOff, 
  MoreVertical
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ProjectDialog } from './ProjectDialog';

export function ProjectList() {
  const { 
    projects,
    threads,
    createProject,
    updateProject,
    hideProject,
    unhideProject,
    createThreadInProject
  } = useChat();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Filter projects to show only non-hidden ones
  const visibleProjects = projects.filter(project => !project.hidden);

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleCreateProject = () => {
    setCurrentProject(null);
    setIsDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    setIsDialogOpen(true);
  };

  const handleSaveProject = async (name: string, systemPrompt: string) => {
    if (currentProject) {
      // Update existing project
      await updateProject(currentProject.id, { 
        name, 
        system_prompt: systemPrompt 
      });
    } else {
      // Create new project
      await createProject(name, systemPrompt);
    }
    setIsDialogOpen(false);
  };

  const handleToggleProjectVisibility = (project: Project) => {
    if (project.hidden) {
      unhideProject(project.id);
    } else {
      hideProject(project.id);
    }
  };

  const handleCreateThreadInProject = (projectId: string) => {
    createThreadInProject(projectId);
  };

  // Get threads that belong to a specific project
  const getProjectThreads = (projectId: string) => {
    return threads.filter(thread => thread.project_id === projectId && !thread.hidden);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-2 py-2">
        <h2 className="text-md font-semibold text-white">Projects</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 text-gray-300 hover:text-white hover:bg-[#FFFFFF]/10"
          onClick={handleCreateProject}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">New Project</span>
        </Button>
      </div>

      <div className="space-y-1 px-1">
        {visibleProjects.length > 0 ? (
          visibleProjects.map(project => (
            <div key={project.id} className="rounded-md hover:bg-[#FFFFFF]/5">
              <div className="flex items-center justify-between px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex items-center justify-start p-0 text-gray-300 hover:text-white hover:bg-transparent"
                  onClick={() => toggleProjectExpansion(project.id)}
                >
                  {expandedProjects[project.id] ? (
                    <ChevronDown className="h-4 w-4 mr-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-1" />
                  )}
                  <span className="truncate max-w-[150px]">{project.name}</span>
                </Button>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-[#FFFFFF]/10"
                    onClick={() => handleCreateThreadInProject(project.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="sr-only">New Thread</span>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-[#FFFFFF]/10"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleEditProject(project)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleProjectVisibility(project)}>
                        {project.hidden ? (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Show Project
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide Project
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Display project threads if expanded */}
              {expandedProjects[project.id] && (
                <div className="pl-6 pr-2 mt-1 mb-1 space-y-1">
                  {getProjectThreads(project.id).map(thread => (
                    <ThreadListItem key={thread.id} thread={thread} />
                  ))}
                  {getProjectThreads(project.id).length === 0 && (
                    <p className="text-sm text-gray-400 px-2 py-1">No threads in this project</p>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400 px-2 py-1">No projects yet</p>
        )}
      </div>

      <ProjectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveProject}
        project={currentProject}
      />
    </div>
  );
}

interface ThreadListItemProps {
  thread: {
    id: string;
    title: string;
  };
}

function ThreadListItem({ thread }: ThreadListItemProps) {
  const { selectThread, currentThread } = useChat();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`w-full h-7 justify-start text-left truncate text-sm ${
        currentThread?.id === thread.id 
          ? 'bg-[#FFFFFF]/20 font-bold' 
          : 'hover:bg-[#FFFFFF]/10'
      }`}
      onClick={() => selectThread(thread.id)}
    >
      <span className="truncate max-w-[130px]">{thread.title}</span>
    </Button>
  );
}
