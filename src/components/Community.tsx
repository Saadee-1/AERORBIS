import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, BookOpen, Users, FileCode } from "lucide-react";
import { useActiveSection } from "@/hooks/useActiveSection";

const Community = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "community";

  const features = [
    {
      icon: MessageCircle,
      title: "Discord Community",
      description: "Real-time discussions with aerospace enthusiasts worldwide",
    },
    {
      icon: BookOpen,
      title: "Forum & Q&A",
      description: "Ask questions and share knowledge with the community",
    },
    {
      icon: Users,
      title: "Student Projects",
      description: "Collaborate on exciting aerospace projects together",
    },
    {
      icon: FileCode,
      title: "Research Articles",
      description: "Read and contribute to our growing knowledge base",
    },
  ];

  return (
    <section 
      id="community" 
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
            Join the AeroVerse Community
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Collaborate with other aerospace minds, share ideas, and grow together
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-400/10 flex items-center justify-center mx-auto mb-4 hover:bg-cyan-400/20 transition-colors">
                <feature.icon className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-sm text-gray-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] text-lg px-12 py-6 font-semibold transition-all duration-300"
          >
            Join Now
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Community;
