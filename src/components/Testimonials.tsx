import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Aerospace Engineering Student",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    quote: "AERORBIS transformed my understanding of orbital mechanics. The interactive tools made complex concepts incredibly clear.",
  },
  {
    name: "Marcus Williams",
    role: "Research Assistant",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    quote: "The research community here is invaluable. I've collaborated on projects I never thought possible as an undergrad.",
  },
  {
    name: "Dr. Priya Patel",
    role: "PhD Candidate",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    quote: "An exceptional platform for aerospace education. The depth and quality of resources rival paid courses.",
  },
];

const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section id="testimonials" className="py-16 sm:py-28 bg-transparent relative">
      <div className="section-divider mb-16 sm:mb-28" />
      <div ref={ref} className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-hud text-xs mb-4 block">// Crew Reports</span>
          <h2 className="heading-1 text-foreground mb-4">What Our Community Says</h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={itemVariants}
              className="group"
            >
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg p-8 h-full transition-all duration-300 hover:border-primary/30 hover:bg-card/60 hud-corners text-center">
                <Quote className="w-8 h-8 text-primary/40 mb-4 mx-auto" />
                <p className="text-sm text-muted-foreground mb-6 italic leading-relaxed">
                  "{t.quote}"
                </p>
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-12 h-12 rounded-full border-2 border-primary/20 group-hover:border-primary/50 transition-colors"
                  />
                  <div>
                    <div className="font-semibold text-sm text-foreground font-[Rajdhani] tracking-wide">{t.name}</div>
                    <div className="text-xs text-primary/70 uppercase tracking-wider">{t.role}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
