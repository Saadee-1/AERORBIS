import { useRef } from "react";
import { useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, Users, Lightbulb } from "lucide-react";

const Research = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

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
    <section id="research" className="py-24 bg-transparent">
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
            Research & Innovation
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Pushing the boundaries of aerospace engineering through collaborative research
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card/30 border border-border/50 rounded-lg p-6 text-center transition-colors duration-150 hover:border-border"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            className="transition-colors duration-150"
          >
            Contribute Research
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Research;
