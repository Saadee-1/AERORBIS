import { motion, useInView, Variants } from "framer-motion";
import { useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  variant?: "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight" | "scale" | "blur" | "slideUp";
  delay?: number;
  duration?: number;
  once?: boolean;
  margin?: string;
  stagger?: boolean;
  staggerDelay?: number;
}

const variants: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
  slideUp: {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
};

export const ScrollReveal = ({
  children,
  className,
  variant = "fadeUp",
  delay = 0,
  duration = 0.7,
  once = true,
  margin = "-50px",
}: ScrollRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const marginValue = margin as `${number}px`;
  const isInView = useInView(ref, { once, margin: marginValue });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};

interface ScrollRevealListProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  variant?: "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight" | "scale" | "blur" | "slideUp";
  staggerDelay?: number;
  duration?: number;
  once?: boolean;
  margin?: string;
}

export const ScrollRevealList = ({
  children,
  className,
  itemClassName,
  variant = "fadeUp",
  staggerDelay = 0.1,
  duration = 0.6,
  once = true,
  margin = "-50px",
}: ScrollRevealListProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const marginValue = margin as `${number}px`;
  const isInView = useInView(ref, { once, margin: marginValue });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    ...variants[variant],
    visible: {
      ...variants[variant].visible,
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={cn(className)}
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={itemVariants} className={cn(itemClassName)}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

interface ParallaxScrollProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: "up" | "down";
}

export const ParallaxScroll = ({
  children,
  className,
  speed = 0.5,
  direction = "up",
}: ParallaxScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      style={{
        willChange: "transform",
      }}
      whileInView={{
        y: direction === "up" ? -20 * speed : 20 * speed,
      }}
      initial={{ y: 0 }}
      transition={{
        type: "tween",
        ease: "linear",
      }}
      viewport={{ once: false, margin: "-20%" }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
