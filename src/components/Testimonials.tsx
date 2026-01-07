import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { useActiveSection } from "@/hooks/useActiveSection";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Aerospace Engineering Student",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    quote:
      "AeroVerse transformed my understanding of orbital mechanics. The interactive tools made complex concepts incredibly clear.",
  },
  {
    name: "Marcus Williams",
    role: "Research Assistant",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    quote:
      "The research community here is invaluable. I've collaborated on projects I never thought possible as an undergrad.",
  },
  {
    name: "Dr. Priya Patel",
    role: "PhD Candidate",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    quote:
      "An exceptional platform for aerospace education. The depth and quality of resources rival paid courses.",
  },
];

const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "testimonials";

  return (
    <section 
      id="testimonials" 
      className={`py-24 bg-transparent relative overflow-hidden transition-all duration-500 ${
        isActive ? "border-t border-b border-primary/20" : ""
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            What Our Community Says
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.03, y: -5 }}
            >
              <Card className="h-full bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300">
                <CardContent className="pt-6 text-center">
                  <Quote className="w-10 h-10 text-cyan-400 mb-4 mx-auto drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  <p className="text-gray-300 mb-6 italic">{testimonial.quote}</p>
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full border-2 border-cyan-400/30"
                    />
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-gray-400">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
