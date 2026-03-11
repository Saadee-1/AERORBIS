import Hero from "@/components/Hero";
import About from "@/components/About";
import LearningModules from "@/components/LearningModules";
import Research from "@/components/Research";
import Tools from "@/components/Tools";
import Community from "@/components/Community";

import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      <Hero />
      <About />
      <LearningModules />
      <Research />
      <Tools />
      <Community />
      
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
