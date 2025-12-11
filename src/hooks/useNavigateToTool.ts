import { useNavigate } from 'react-router-dom';

export function useNavigateToTool() {
  const navigate = useNavigate();

  return (toolId: string, options?: { focus?: string }) => {
    const params = new URLSearchParams();
    params.set('tool', toolId);
    if (options?.focus) {
      params.set('focus', options.focus);
    }
    navigate(`/tools/launch?${params.toString()}`);
  };
}

