import { useRef } from "react";
import { useInView, useScroll, useTransform, MotionValue, UseInViewOptions } from "framer-motion";

type MarginType = UseInViewOptions["margin"];

export interface ScrollAnimationOptions {
  once?: boolean;
  margin?: MarginType;
  amount?: "some" | "all" | number;
}

export interface UseScrollAnimationReturn {
  ref: React.RefObject<HTMLDivElement>;
  isInView: boolean;
  scrollYProgress: MotionValue<number>;
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
  y: MotionValue<number>;
  x: MotionValue<number>;
  rotate: MotionValue<number>;
}

/**
 * Custom hook for scroll-triggered animations
 * Provides various motion values for parallax, fade, scale effects
 */
export const useScrollAnimation = (
  options: ScrollAnimationOptions = {}
): UseScrollAnimationReturn => {
  const { once = true, margin = "-100px" as MarginType, amount = 0.3 } = options;
  
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin, amount });
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Create transform values for various effects
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [100, 0, -100]);
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [-50, 0, 50]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-5, 5]);

  return {
    ref,
    isInView,
    scrollYProgress,
    opacity,
    scale,
    y,
    x,
    rotate,
  };
};

/**
 * Stagger animation variants for child elements
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

/**
 * Fade variants with different directions
 */
export const fadeVariants = {
  up: {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    },
  },
  down: {
    hidden: { opacity: 0, y: -40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    },
  },
  left: {
    hidden: { opacity: 0, x: 40 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    },
  },
  right: {
    hidden: { opacity: 0, x: -40 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    },
  },
};

/**
 * Parallax effect hook for background elements
 */
export const useParallax = (value: MotionValue<number>, distance: number) => {
  return useTransform(value, [0, 1], [-distance, distance]);
};

/**
 * Card hover animation variants
 */
export const cardHoverVariants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: "0 0 0 rgba(34, 211, 238, 0)",
  },
  hover: {
    scale: 1.02,
    y: -8,
    boxShadow: "0 20px 40px rgba(34, 211, 238, 0.15)",
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

/**
 * Text reveal animation (character by character)
 */
export const textRevealVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.03,
    },
  }),
};

/**
 * Floating animation for decorative elements
 */
export const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Glow pulse animation
 */
export const glowPulseAnimation = {
  initial: { 
    boxShadow: "0 0 20px rgba(34, 211, 238, 0.2)" 
  },
  animate: {
    boxShadow: [
      "0 0 20px rgba(34, 211, 238, 0.2)",
      "0 0 40px rgba(34, 211, 238, 0.4)",
      "0 0 20px rgba(34, 211, 238, 0.2)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
