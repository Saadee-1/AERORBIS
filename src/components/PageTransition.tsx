import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, filter: 'blur(8px)', y: -10 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.35 },
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
