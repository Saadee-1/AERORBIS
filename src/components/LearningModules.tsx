import { useRef } from "react";
import { useInView } from "framer-motion";
import { Wind, Rocket, Plane, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    icon: Wind,
    title: "Aerodynamics & Flight Mechanics",
    description:
      "Master the principles of lift, drag, and fluid dynamics. Understand how aircraft achieve and maintain flight.",
  },
  {
    icon: Rocket,
    title: "Rocket Propulsion Systems",
    description:
      "Explore chemical, electric, and nuclear propulsion. Learn rocket equations and thrust dynamics.",
  },
  {
    icon: Plane,
    title: "Aircraft Design & Structures",
    description:
      "Study structural analysis, materials selection, and design optimization for modern aircraft.",
  },
  {
    icon: Satellite,
    title: "Space Systems & Orbital Dynamics",
    description:
      "Dive into orbital mechanics, satellite systems, and mission planning for space exploration.",
  },
];

const LearningModules = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="learn" className="py-24 bg-transparent">
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
            Featured Learning Modules
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Comprehensive courses designed to take you from fundamentals to advanced concepts
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {modules.map((module) => (
            <Card 
              key={module.title}
              className="h-full bg-card/50 border border-border/50 rounded-lg transition-colors duration-150 hover:border-border group"
            >
              <CardHeader className="text-center">
                <div className="w-14 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 mx-auto transition-colors duration-150 group-hover:border-primary/40">
                  <module.icon className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-lg text-foreground">{module.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-sm text-muted-foreground mb-4">
                  {module.description}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80 hover:bg-primary/5 transition-colors duration-150"
                >
                  Learn More →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearningModules;
