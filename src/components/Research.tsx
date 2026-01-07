import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Users, Lightbulb } from "lucide-react";
import { useActiveSection } from "@/hooks/useActiveSection";

const Research = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "research";

  const features = [
    {
      icon: FileText,
      title: "Published Papers",
      description: "Access peer-reviewed research and contribute your findings",
    },
    {
      icon: Users,
      title: "Research Guidance",
      description: "Connect with mentors and collaborate on projects",
    },
    {
      icon: Lightbulb,
      title: "Open Projects",
      description: "Join ongoing research initiatives in aerospace innovation",
    },
  ];

  return (
    <section 
      id="research" 
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-glow">
            Research & Innovation
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pushing the boundaries of aerospace engineering through collaborative research
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className="bg-card/30 backdrop-blur-lg border border-primary/20 rounded-xl p-6 hover:border-primary/40 transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12"
        >
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Contribute Research
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Research;
