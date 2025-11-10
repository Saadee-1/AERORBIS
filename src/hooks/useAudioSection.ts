import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudioController } from './useAudioController';

const routeToSection: { [key: string]: string } = {
  '/': 'home',
  '/learn': 'learn',
  '/research': 'research',
  '/tools': 'tools',
  '/community': 'community',
  '/contact': 'home', // Use home ambient for contact
  '/dashboard': 'dashboard',
  '/dashboard/learning': 'dashboard',
  '/dashboard/research': 'dashboard',
  '/dashboard/tools': 'dashboard',
  '/dashboard/profile': 'dashboard',
};

export const useAudioSection = () => {
  const location = useLocation();
  const { playSection } = useAudioController();

  useEffect(() => {
    const section = routeToSection[location.pathname] || 'home';
    playSection(section);
  }, [location.pathname, playSection]);
};
