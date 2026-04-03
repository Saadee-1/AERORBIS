import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BookOpen, Rocket, Plane, Satellite, Wrench, Box } from "lucide-react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageBreadcrumb from "@/components/PageBreadcrumb";

const Learn = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const categories = [
    { id: "aerodynamics", label: "Aerodynamics", icon: Plane },
    { id: "propulsion", label: "Propulsion Systems", icon: Rocket },
    { id: "design", label: "Aircraft Design", icon: Box },
    { id: "orbital", label: "Orbital Mechanics", icon: Satellite },
    { id: "materials", label: "Materials & Structures", icon: Wrench },
  ];

  const modules = {
    aerodynamics: [
      { title: "Introduction to Aerodynamics" },
      { title: "Boundary Layer Theory" },
      { title: "High-Speed Aerodynamics" },
    ],
    propulsion: [
      { title: "Rocket Propulsion Basics" },
      { title: "Jet Engine Systems" },
      { title: "Advanced Propulsion Systems" },
    ],
    design: [
      { title: "Aircraft Design Fundamentals" },
      { title: "Structural Analysis" },
      { title: "Composite Materials Design" },
    ],
    orbital: [
      { title: "Orbital Mechanics 101" },
      { title: "Mission Planning" },
      { title: "Interplanetary Navigation" },
    ],
    materials: [
      { title: "Material Science Basics" },
      { title: "Fatigue and Failure Analysis" },
      { title: "Smart Materials" },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <PageBreadcrumb />
      
      {/* Hero Section */}
      <section className="pt-24 pb-8 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="inline-block mb-4"
            >
              <BookOpen className="w-12 h-12 text-primary drop-shadow-[0_0_20px_hsl(160_84%_39%/0.8)]" />
            </motion.div>
            
            <h1 className="text-[26px] md:text-[32px] lg:text-[44px] leading-tight font-bold mb-4 font-[Orbitron] uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
              Aerospace Learning Hub
            </h1>
            
            <p className="text-base text-muted-foreground mb-4 leading-relaxed max-w-2xl mx-auto">
              Master the fundamentals and advance your skills with structured learning paths designed by industry experts
            </p>
          </motion.div>
        </div>
      </section>

      {/* Learning Modules */}
      <section ref={ref} className="py-16 relative">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="aerodynamics" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-12 gap-2 h-auto bg-card/50 backdrop-blur-lg border border-primary/20 p-2 rounded-2xl">
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col gap-2 py-4 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-xl transition-all duration-300"
                >
                  <category.icon className="w-5 h-5" />
                  <span className="text-xs md:text-sm">{category.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(modules).map(([categoryId, categoryModules]) => (
              <TabsContent key={categoryId} value={categoryId}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryModules.map((module, index) => (
                    <motion.div
                      key={module.title}
                      initial={{ opacity: 0, y: 30 }}
                      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 1.03, y: -5 }}
                    >
                      <Card className="h-full flex flex-col bg-card/50 backdrop-blur-lg border-primary/20 rounded-2xl overflow-hidden hover:border-primary/60 hover:shadow-[0_0_40px_hsl(160_84%_39%/0.3)] transition-all duration-300">
                        <CardHeader>
                          <CardTitle className="text-xl text-foreground">{module.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center justify-center">
                          <p className="text-sm text-primary/70 tracking-wider uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Coming Soon</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Featured Resources */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
              Featured Video Lectures
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Expert tutorials and demonstrations from aerospace professionals
            </p>
            <p className="text-sm text-primary/70 tracking-wider uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Coming Soon — Video lectures under production</p>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
              Ready to Apply Your Knowledge?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Explore cutting-edge research or test your skills with interactive tools
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-[0_0_30px_hsl(160_84%_39%/0.4)] hover:shadow-[0_0_50px_hsl(160_84%_39%/0.6)] transition-all duration-300"
                asChild
              >
                <a href="/research">Explore Research</a>
              </Button>
              <Button 
                size="lg" 
                className="bg-card/50 backdrop-blur-lg border-primary/30 hover:border-primary/60 text-foreground font-semibold px-8 py-6 text-lg rounded-xl hover:shadow-[0_0_30px_hsl(160_84%_39%/0.3)] transition-all duration-300"
                asChild
              >
                <a href="/tools">Try Tools</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Learn;
