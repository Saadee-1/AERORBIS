import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
      transition={{ 
        duration: 0.6, 
        ease: 'easeInOut',
        opacity: { duration: 0.4 },
        scale: { duration: 0.6 }
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
