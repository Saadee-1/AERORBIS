import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

// Ultra-smooth cubic-bezier: Apple-style deceleration
const smoothEase = [0.16, 1, 0.3, 1];

const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(6px)', y: 12, scale: 0.995 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(4px)', y: -8, scale: 0.998 }}
      transition={{
        duration: 0.45,
        ease: smoothEase,
        opacity: { duration: 0.3, ease: smoothEase },
        filter: { duration: 0.4, ease: smoothEase },
        scale: { duration: 0.5, ease: smoothEase },
      }}
      style={{ willChange: 'opacity, transform, filter' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
