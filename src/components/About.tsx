import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import aboutImage from "@/assets/about-satellite.jpg";
import { useActiveSection } from "@/hooks/useActiveSection";

const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "about";

  return (
    <section 
      id="about" 
      className={`py-24 bg-gradient-to-b from-black via-slate-900 to-black relative overflow-hidden transition-all duration-500 ${
        isActive ? "shadow-[inset_0_0_100px_rgba(34,211,238,0.4)] border-t-4 border-b-4 border-cyan-400/50" : ""
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

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl p-2 hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300"
            whileHover={{ scale: 1.03, y: -5 }}
          >
            <img
              src={aboutImage}
              alt="Satellite and orbital mechanics visualization"
              className="rounded-xl w-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-6"
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
              <div className="text-center bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-xl p-4 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300">
                <div className="text-4xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">50+</div>
                <div className="text-sm text-gray-400">Courses</div>
              </div>
              <div className="text-center bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-xl p-4 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300">
                <div className="text-4xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">10K+</div>
                <div className="text-sm text-gray-400">Students</div>
              </div>
              <div className="text-center bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-xl p-4 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300">
                <div className="text-4xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">100+</div>
                <div className="text-sm text-gray-400">Resources</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
