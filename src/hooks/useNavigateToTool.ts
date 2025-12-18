import { useNavigate, createSearchParams } from 'react-router-dom';
import { ToolId, TOOL_ROUTES } from '@/components/tools/utils/interlinkConfig';

export function useNavigateToTool() {
  const navigate = useNavigate();

  const navigateToTool = (toolId: ToolId | 'tools', options?: { focus?: 'inputs' | 'results' | 'graphs' }) => {
    if (toolId === 'tools') {
      // Preserve focus parameter when navigating to tools page
      const params = new URLSearchParams();
      if (options?.focus) {
        params.set('focus', options.focus);
      }
      const finalRoute = params.toString() ? `/tools/launch?${params.toString()}` : '/tools/launch';
      navigate(finalRoute);
      return;
    }

    // Use TOOL_ROUTES as single source of truth
    const route = TOOL_ROUTES[toolId];
    if (!route) {
      console.error(`[useNavigateToTool] Missing route for toolId: ${toolId}. Available routes:`, Object.keys(TOOL_ROUTES));
      // Fallback to launch page but log error
      navigate('/tools/launch');
      return;
    }

    // Parse existing query params from route
    const [basePath, existingQuery] = route.split('?');
    const params = new URLSearchParams(existingQuery || '');
    
    // Add focus option if provided
    if (options?.focus) {
      params.set('focus', options.focus);
    }

    // Navigate with all params
    const finalRoute = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    navigate(finalRoute);
  };

  return navigateToTool;
}

