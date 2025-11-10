import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BookOpen, Rocket, Plane, Satellite, Wrench, Box } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";

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
      { title: "Introduction to Aerodynamics", description: "Understand the basics of airflow and lift generation", level: "Beginner", progress: 75 },
      { title: "Boundary Layer Theory", description: "Explore flow separation and turbulence concepts", level: "Intermediate", progress: 45 },
      { title: "High-Speed Aerodynamics", description: "Master supersonic and hypersonic flight principles", level: "Advanced", progress: 20 },
    ],
    propulsion: [
      { title: "Rocket Propulsion Basics", description: "Learn thrust generation and combustion principles", level: "Beginner", progress: 60 },
      { title: "Jet Engine Systems", description: "Study turbofan and turboprop engine mechanics", level: "Intermediate", progress: 30 },
      { title: "Advanced Propulsion Systems", description: "Explore ion drives and future propulsion tech", level: "Advanced", progress: 0 },
    ],
    design: [
      { title: "Aircraft Design Fundamentals", description: "Introduction to aircraft configuration and sizing", level: "Beginner", progress: 80 },
      { title: "Structural Analysis", description: "Learn stress, strain, and fatigue analysis", level: "Intermediate", progress: 55 },
      { title: "Composite Materials Design", description: "Advanced lightweight structure design", level: "Advanced", progress: 15 },
    ],
    orbital: [
      { title: "Orbital Mechanics 101", description: "Understand orbits, trajectories, and transfers", level: "Beginner", progress: 90 },
      { title: "Mission Planning", description: "Design space missions and calculate delta-v", level: "Intermediate", progress: 40 },
      { title: "Interplanetary Navigation", description: "Master gravity assists and deep space travel", level: "Advanced", progress: 10 },
    ],
    materials: [
      { title: "Material Science Basics", description: "Properties of aerospace materials", level: "Beginner", progress: 70 },
      { title: "Fatigue and Failure Analysis", description: "Study material behavior under stress", level: "Intermediate", progress: 35 },
      { title: "Smart Materials", description: "Explore shape memory alloys and composites", level: "Advanced", progress: 0 },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black relative">
      <DeepSpaceDataBackground />
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="inline-block mb-6"
            >
              <BookOpen className="w-20 h-20 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Aerospace Learning Hub
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Master the fundamentals and advance your skills with structured learning paths designed by industry experts
            </p>
          </motion.div>
        </div>
      </section>

      {/* Learning Modules */}
      <section ref={ref} className="py-16 relative">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="aerodynamics" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-12 gap-2 h-auto bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 p-2 rounded-2xl">
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col gap-2 py-4 data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400 rounded-xl transition-all duration-300"
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
                      <Card className="h-full flex flex-col bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 rounded-2xl overflow-hidden hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300">
                        <CardHeader>
                          <div className="flex justify-between items-start mb-2">
                            <CardTitle className="text-xl text-white">{module.title}</CardTitle>
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              module.level === "Beginner" ? "bg-cyan-400/20 text-cyan-400" :
                              module.level === "Intermediate" ? "bg-blue-400/20 text-blue-400" :
                              "bg-purple-400/20 text-purple-400"
                            }`}>
                              {module.level}
                            </span>
                          </div>
                          <CardDescription className="text-gray-300">{module.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-400">
                              <span>Progress</span>
                              <span className="text-cyan-400 font-semibold">{module.progress}%</span>
                            </div>
                            <Progress value={module.progress} className="h-2" />
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                            {module.progress > 0 ? "Continue Learning" : "Start Learning"}
                          </Button>
                        </CardFooter>
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
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Featured Video Lectures
            </h2>
            <p className="text-gray-300 text-lg">
              Expert tutorials and demonstrations from aerospace professionals
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: "Introduction to Flight Dynamics", duration: "45 min", instructor: "Dr. Sarah Chen" },
              { title: "Rocket Engine Design Fundamentals", duration: "60 min", instructor: "Prof. Michael Torres" },
            ].map((video, index) => (
              <motion.div
                key={video.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
              >
                <Card className="bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 rounded-2xl overflow-hidden hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300">
                  <CardHeader>
                    <div className="aspect-video bg-slate-900/50 rounded-lg mb-4 flex items-center justify-center border border-cyan-400/10">
                      <BookOpen className="w-16 h-16 text-cyan-400/60" />
                    </div>
                    <CardTitle className="text-white">{video.title}</CardTitle>
                    <CardDescription className="text-gray-300">
                      {video.duration} • {video.instructor}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                      Watch Now
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Ready to Apply Your Knowledge?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Explore cutting-edge research or test your skills with interactive tools
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all duration-300"
                asChild
              >
                <a href="/research">Explore Research</a>
              </Button>
              <Button 
                size="lg" 
                className="bg-slate-800/50 backdrop-blur-lg border-cyan-400/30 hover:border-cyan-400/60 text-white font-semibold px-8 py-6 text-lg rounded-xl hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-300"
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
