import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Target, Atom } from "lucide-react";

const About = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const pillars = [
    { icon: Target, title: "Precision Tools", desc: "Engineering-grade calculators validated against industry standards" },
    { icon: Shield, title: "Trusted Data", desc: "Peer-reviewed resources and real-world aerospace datasets" },
    { icon: Atom, title: "Deep Learning", desc: "From fundamentals to cutting-edge research methodologies" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section id="about" className="py-16 sm:py-28 bg-transparent relative">
      <div className="section-divider mb-16 sm:mb-28" />
      <div ref={ref} className="container mx-auto px-4 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-4">
            <span className="text-hud text-xs mb-4 block">// System Overview</span>
            <h2 className="heading-1 text-foreground mb-6">What is AERORBIS?</h2>
          </motion.div>

          <motion.p variants={itemVariants} className="text-center text-lg text-muted-foreground max-w-3xl mx-auto mb-16 leading-relaxed">
            A next-generation aerospace engineering platform combining precision tools,
            interactive simulations, and deep learning resources — built for engineers
            who refuse to compromise on accuracy.
          </motion.p>

          <motion.div variants={containerVariants} className="grid md:grid-cols-3 gap-6">
            {pillars.map((pillar) => (
              <motion.div
                key={pillar.title}
                variants={itemVariants}
                className="relative group"
              >
                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-lg p-8 h-full transition-all duration-300 hover:border-primary/40 hover:bg-card/60 hud-corners">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_hsl(160_84%_39%/0.15)] transition-all duration-300">
                    <pillar.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 font-[Rajdhani] tracking-wide">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;
