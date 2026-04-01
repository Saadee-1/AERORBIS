import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

// Ultra-smooth Apple-style deceleration

const PageTransition = ({ children }: PageTransitionProps) => {
  // Use initial={false} on first app mount to prevent blank-screen on refresh.
  // Framer Motion will start at the `animate` values (fully visible).
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(6px)', y: 12, scale: 0.995 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(4px)', y: -8, scale: 0.998 }}
      transition={{
        duration: 0.45,
        ease: "easeOut",
        opacity: { duration: 0.3 },
        filter: { duration: 0.4 },
        scale: { duration: 0.5 },
      }}
      style={{ willChange: 'opacity, transform, filter' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
