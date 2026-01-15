import { useRef } from "react";
import { useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, BookOpen, Users, FileCode } from "lucide-react";

const Community = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const features = [
    {
      icon: MessageCircle,
      title: "Discord Community",
      description: "Real-time discussions with aerospace enthusiasts worldwide",
    },
    {
      icon: BookOpen,
      title: "Forum & Q&A",
      description: "Ask questions and share knowledge with the community",
    },
    {
      icon: Users,
      title: "Student Projects",
      description: "Collaborate on exciting aerospace projects together",
    },
    {
      icon: FileCode,
      title: "Research Articles",
      description: "Read and contribute to our growing knowledge base",
    },
  ];

  return (
    <section id="community" className="py-24 bg-transparent">
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
            Join the AERORBIS Community
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Collaborate with other aerospace minds, share ideas, and grow together
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-colors duration-150 hover:bg-primary/15">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="transition-colors duration-150"
          >
            Join Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Community;
