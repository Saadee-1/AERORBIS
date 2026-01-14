import { motion, useScroll, useTransform } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";

const About = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" as `${number}px` });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "about";

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  const stats = [
    { value: "50+", label: "Courses", delay: 0 },
    { value: "10K+", label: "Students", delay: 0.1 },
    { value: "100+", label: "Resources", delay: 0.2 },
  ];

  return (
    <section 
      ref={sectionRef}
      id="about" 
      className={`py-24 bg-transparent relative overflow-hidden transition-all duration-500 ${
        isActive ? "border-t border-b border-primary/20" : ""
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8 relative z-10" ref={contentRef}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent"
            style={{ y }}
          >
            What is AERORBIS?
          </motion.h2>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6 text-center"
          >
            <motion.p 
              className="text-lg text-gray-300 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              AERORBIS is a professional aerospace engineering platform supporting engineers and researchers 
              at all levels. Access precision tools for aerodynamics, propulsion, orbital mechanics, 
              materials science, and more.
            </motion.p>
            <motion.p 
              className="text-lg text-gray-400 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Our mission is to democratize aerospace education, making advanced concepts
              accessible to everyone with a passion for flight and space exploration. Join
              thousands of aspiring engineers on their journey to the stars.
            </motion.p>

            <motion.div 
              className="grid grid-cols-3 gap-6 pt-6"
              style={{ opacity }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center bg-card/30 backdrop-blur-lg border border-primary/20 rounded-xl p-4 hover:border-primary/40 transition-all duration-300"
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
                  transition={{ duration: 0.6, delay: 0.5 + stat.delay }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -5,
                    boxShadow: "0 10px 40px rgba(34, 211, 238, 0.2)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div 
                    className="text-4xl font-bold text-primary mb-2"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.5, delay: 0.7 + stat.delay, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
