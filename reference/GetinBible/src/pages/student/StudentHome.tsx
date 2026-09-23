import React, { useState, useEffect } from 'react';
import BibleBooklist from '../../../components/BibleBooklist';
import BibleBookPlayer from '../../../components/BibleBookPlayer';
import { Module } from '../../../types';
import { useAuth } from '../../hooks/useAuth';
import { getUserProgress, markModuleComplete } from '../../../services/progressService';
import { getUserChaptersRead } from '../../../services/responseService';

const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [chaptersRead, setChaptersRead] = useState<Record<number, string>>({});

  useEffect(() => {
    if (user) {
      getUserProgress(user.id).then(setCompletedModules);
      getUserChaptersRead(user.id).then(setChaptersRead);
    }
  }, [user]);

  const handleModuleSelect = (module: Module) => {
    setSelectedModule(module);
    window.scrollTo(0, 0);
  };

  const handleModuleComplete = async () => {
    if (selectedModule && user) {
      try {
        await markModuleComplete(user.id, selectedModule.id);
        setCompletedModules(prev => Array.from(new Set([...prev, selectedModule.id])));
        setSelectedModule(null);
      } catch (error) {
        console.error('Failed to save progress:', error);
        setCompletedModules(prev => Array.from(new Set([...prev, selectedModule.id])));
        setSelectedModule(null);
      }
    }
  };

  if (selectedModule) {
    return (
      <BibleBookPlayer
        module={selectedModule}
        user={user}
        onComplete={handleModuleComplete}
      />
    );
  }

  return <BibleBooklist onSelectModule={handleModuleSelect} chaptersRead={chaptersRead} />;
};

export default StudentHome;
