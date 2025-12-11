import { useNavigate, createSearchParams } from 'react-router-dom';
import { ToolId } from '@/components/tools/utils/interlinkConfig';

export function useNavigateToTool() {
  const navigate = useNavigate();

  const navigateToTool = (toolId: ToolId | 'tools', options?: { focus?: 'inputs' | 'results' | 'graphs' }) => {
    const params = new URLSearchParams();
    if (options?.focus) {
      params.set('focus', options.focus);
    }
    if (toolId === 'tools') {
      navigate(`/tools/launch?${params.toString()}`);
    } else {
      params.set('tool', toolId);
      navigate(`/tools/launch?${params.toString()}`);
    }
  };

  return navigateToTool;
}

