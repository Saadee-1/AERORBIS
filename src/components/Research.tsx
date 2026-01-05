import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Users, Lightbulb } from "lucide-react";
import researchImage from "@/assets/research-lab.jpg";
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-glow">
            Research & Innovation
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pushing the boundaries of aerospace engineering through collaborative research
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="order-2 lg:order-1 space-y-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Contribute Research
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="order-1 lg:order-2"
          >
            <img
              src={researchImage}
              alt="Aerospace research laboratory"
              className="rounded-lg shadow-2xl w-full hover-lift"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Research;
