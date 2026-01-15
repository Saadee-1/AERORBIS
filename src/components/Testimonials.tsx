import { useRef } from "react";
import { useInView } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Aerospace Engineering Student",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    quote:
      "AERORBIS transformed my understanding of orbital mechanics. The interactive tools made complex concepts incredibly clear.",
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
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="testimonials" className="py-24 bg-transparent">
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
            What Our Community Says
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.name}
              className="h-full bg-card/50 border border-border/50 rounded-lg transition-colors duration-150 hover:border-border"
            >
              <CardContent className="pt-6 text-center">
                <Quote className="w-8 h-8 text-primary/60 mb-4 mx-auto" />
                <p className="text-sm text-muted-foreground mb-6 italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full border border-border/50"
                  />
                  <div>
                    <div className="font-medium text-sm text-foreground">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
