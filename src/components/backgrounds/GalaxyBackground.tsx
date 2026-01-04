import { useEffect, useRef } from 'react';
import { SpaceEnvironment, SpaceEnvironmentConfig } from '@/lib/SpaceEnvironment';

const GalaxyBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const environmentRef = useRef<SpaceEnvironment | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const config: SpaceEnvironmentConfig = {
      starCount: 3000,
      nebulaIntensity: 0.15,
      particleCount: 200,
      cursorInfluence: 0.05,
      parallaxStrength: 30,
    };

    // Initialize space environment
    environmentRef.current = new SpaceEnvironment(canvasRef.current, config);

    // Mouse tracking for parallax
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
      environmentRef.current?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default GalaxyBackground;
