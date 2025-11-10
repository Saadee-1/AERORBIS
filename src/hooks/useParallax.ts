import { useEffect, useState } from 'react';

interface ParallaxValues {
  mouseX: number;
  mouseY: number;
  scrollY: number;
}

export const useParallax = () => {
  const [values, setValues] = useState<ParallaxValues>({
    mouseX: 0,
    mouseY: 0,
    scrollY: 0,
  });

  useEffect(() => {
    let ticking = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const x = (e.clientX / window.innerWidth - 0.5) * 2;
          const y = (e.clientY / window.innerHeight - 0.5) * 2;
          setValues(prev => ({ ...prev, mouseX: x, mouseY: y }));
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setValues(prev => ({ ...prev, scrollY: window.scrollY }));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return values;
};
