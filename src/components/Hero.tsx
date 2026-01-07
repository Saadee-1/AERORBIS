import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center bg-transparent pt-14"
    >
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-foreground tracking-tight">
            Aerospace Engineering Tools & Resources
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
            A professional platform providing precision engineering calculators,
            technical reference data, and educational resources for aerospace
            engineers and students.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="px-6">
              <Link to="/tools">Explore Tools</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-6">
              <Link to="/learn">View Documentation</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
