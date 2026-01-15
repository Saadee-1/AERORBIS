import { useRef } from "react";
import { useInView } from "framer-motion";
import { Calculator, TrendingUp, Orbit, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  {
    icon: Calculator,
    title: "Rocket Thrust Calculator",
    description: "Calculate thrust, specific impulse, and performance metrics",
  },
  {
    icon: TrendingUp,
    title: "Lift-to-Drag Ratio Visualizer",
    description: "Analyze aerodynamic efficiency with interactive charts",
  },
  {
    icon: Orbit,
    title: "Orbital Path Simulator",
    description: "Simulate and visualize satellite trajectories",
  },
  {
    icon: Database,
    title: "Material Density Database",
    description: "Access comprehensive aerospace materials data",
  },
];

const Tools = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="tools" className="py-24 bg-transparent">
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
            Tools & Simulators
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Powerful interactive tools to accelerate your learning and research
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {tools.map((tool) => (
            <Card 
              key={tool.title}
              className="h-full bg-card/50 border border-border/50 rounded-lg transition-colors duration-150 hover:border-border group cursor-pointer text-center"
            >
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-colors duration-150 group-hover:bg-primary/15">
                  <tool.icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg text-foreground">{tool.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Tools;
