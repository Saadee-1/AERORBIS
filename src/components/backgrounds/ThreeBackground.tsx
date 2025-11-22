import { useEffect, useRef } from 'react';
import { SpaceEnvironment, SpaceEnvironmentConfig } from '@/lib/SpaceEnvironment';

interface ThreeBackgroundProps {
  config?: SpaceEnvironmentConfig;
}

const ThreeBackground = ({ config }: ThreeBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const environmentRef = useRef<SpaceEnvironment | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Prevent double initialization
    if (environmentRef.current) return;

    // Initialize space environment
    environmentRef.current = new SpaceEnvironment(canvasRef.current, config);

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      environmentRef.current?.updateMousePosition(e.clientX, e.clientY);
    };

    // Scroll tracking
    const handleScroll = () => {
      environmentRef.current?.updateScroll(window.scrollY);
    };

    // Resize handling
    const handleResize = () => {
      environmentRef.current?.resize();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (environmentRef.current) {
        environmentRef.current.dispose();
        environmentRef.current = null;
      }
    };
  }, [config]);

  // Update config when it changes
  useEffect(() => {
    if (environmentRef.current && config) {
      environmentRef.current.transitionTo(config);
    }
  }, [config]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default ThreeBackground;
