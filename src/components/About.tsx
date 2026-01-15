import { useRef } from "react";
import { useInView } from "framer-motion";

const About = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const stats = [
    { value: "50+", label: "Courses" },
    { value: "10K+", label: "Students" },
    { value: "100+", label: "Resources" },
  ];

  return (
    <section id="about" className="py-24 bg-transparent">
      <div 
        ref={ref}
        className="container mx-auto px-4 lg:px-8"
        style={{
          opacity: isInView ? 1 : 0.95,
          transform: isInView ? "translateY(0)" : "translateY(5px)",
          transition: "opacity 220ms ease-out, transform 220ms ease-out",
        }}
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            What is AERORBIS?
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-6 text-center">
            <p className="text-base text-muted-foreground leading-relaxed">
              AERORBIS is a professional aerospace engineering platform supporting engineers and researchers 
              at all levels. Access precision tools for aerodynamics, propulsion, orbital mechanics, 
              materials science, and more.
            </p>
            <p className="text-base text-muted-foreground/80 leading-relaxed">
              Our mission is to democratize aerospace education, making advanced concepts
              accessible to everyone with a passion for flight and space exploration. Join
              thousands of aspiring engineers on their journey to the stars.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-8">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center bg-card/30 border border-border/50 rounded-lg p-4 transition-colors duration-150 hover:border-border"
                >
                  <div className="text-3xl font-semibold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
