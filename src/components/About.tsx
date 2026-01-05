import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";

const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "about";

  return (
    <section 
      id="about" 
      className={`py-24 bg-transparent relative overflow-hidden transition-all duration-500 ${
        isActive ? "border-t border-b border-primary/20" : ""
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            What is AERORBIS?
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6 text-center"
          >
            <p className="text-lg text-gray-300 leading-relaxed">
              AERORBIS is a professional aerospace engineering platform supporting engineers and researchers 
              at all levels. Access precision tools for aerodynamics, propulsion, orbital mechanics, 
              materials science, and more.
            </p>
            <p className="text-lg text-gray-400 leading-relaxed">
              Our mission is to democratize aerospace education, making advanced concepts
              accessible to everyone with a passion for flight and space exploration. Join
              thousands of aspiring engineers on their journey to the stars.
            </p>
            <div className="grid grid-cols-3 gap-6 pt-6">
              <div className="text-center bg-card/30 backdrop-blur-lg border border-primary/20 rounded-xl p-4 hover:border-primary/40 transition-all duration-300">
                <div className="text-4xl font-bold text-primary mb-2">50+</div>
                <div className="text-sm text-muted-foreground">Courses</div>
              </div>
              <div className="text-center bg-card/30 backdrop-blur-lg border border-primary/20 rounded-xl p-4 hover:border-primary/40 transition-all duration-300">
                <div className="text-4xl font-bold text-primary mb-2">10K+</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
              <div className="text-center bg-card/30 backdrop-blur-lg border border-primary/20 rounded-xl p-4 hover:border-primary/40 transition-all duration-300">
                <div className="text-4xl font-bold text-primary mb-2">100+</div>
                <div className="text-sm text-muted-foreground">Resources</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
