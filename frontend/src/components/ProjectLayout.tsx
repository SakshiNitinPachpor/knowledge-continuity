import React, { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Project } from '../types';
import { Sidebar } from './Sidebar';

export const ProjectLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (projectId) {
      api.getProject(projectId)
        .then(p => setProject(p))
        .catch(err => console.error(err));
    }
  }, [projectId]);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-[#F8F6F1] dark:bg-[#111827] transition-colors">
      <Sidebar project={project} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
