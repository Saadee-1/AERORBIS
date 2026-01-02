import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Users, MessageSquare, Briefcase, Trophy, Calendar, Lightbulb, BookOpen, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";
import PageBreadcrumb from "@/components/PageBreadcrumb";

const Community = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const tabs = [
    { id: "forums", label: "Forums", icon: MessageSquare },
    { id: "projects", label: "Student Projects", icon: Briefcase },
    { id: "mentorship", label: "Mentorship", icon: Users },
    { id: "events", label: "Events", icon: Calendar },
  ];

  const forumTopics = [
    { title: "Best practices for CFD mesh generation", author: "Alex Kumar", replies: 23, views: 456, category: "Aerodynamics" },
    { title: "Comparing electric vs chemical propulsion", author: "Sarah Chen", replies: 18, views: 342, category: "Propulsion" },
    { title: "Career advice: Internship vs research position?", author: "Mike Johnson", replies: 31, views: 678, category: "Career" },
    { title: "Understanding boundary layer transition", author: "Emma Rodriguez", replies: 15, views: 289, category: "Aerodynamics" },
  ];

  const studentProjects = [
    { title: "Autonomous Drone Navigation System", author: "Team Skywalkers", description: "AI-powered navigation for UAVs in GPS-denied environments", members: 4, image: "🚁" },
    { title: "Hybrid Rocket Motor Design", author: "Propulsion Lab Alpha", description: "3D-printed hybrid rocket motor with paraffin-based fuel", members: 5, image: "🚀" },
    { title: "Wing Morphing Demonstrator", author: "Adaptive Flight Group", description: "Shape-memory alloy actuated wing morphing mechanism", members: 3, image: "✈️" },
  ];

  const mentors = [
    { name: "Dr. Emily Zhang", expertise: "Hypersonic Aerodynamics", experience: "15 years", availability: "2 slots open" },
    { name: "Prof. James Wilson", expertise: "Electric Propulsion", experience: "20 years", availability: "1 slot open" },
    { name: "Dr. Maria Santos", expertise: "Composite Structures", experience: "12 years", availability: "3 slots open" },
  ];

  const events = [
    { title: "AERORBIS Design Challenge 2026", date: "April 15-17, 2026", type: "Competition", description: "Design an efficient VTOL aircraft" },
    { title: "Guest Lecture: Future of Space Exploration", date: "March 28, 2025", type: "Webinar", description: "By Dr. Sarah Johnson, NASA" },
    { title: "Aerodynamics Workshop Series", date: "Every Tuesday, 6 PM EST", type: "Workshop", description: "Hands-on CFD simulations" },
  ];

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-b from-black via-slate-900 to-black">
      <DeepSpaceDataBackground />
      <Navbar />
      <PageBreadcrumb />
      
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Users className="w-16 h-16 mx-auto mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Join the AERORBIS Community
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Collaborate. Learn. Launch your ideas together.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Community Features */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { icon: MessageSquare, title: "Active Forums", value: "500+ Topics", description: "Discussions on every aerospace field" },
              { icon: Briefcase, title: "Student Projects", value: "150+ Projects", description: "Collaborative engineering teams" },
              { icon: Users, title: "Expert Mentors", value: "50+ Mentors", description: "Industry professionals guiding students" },
              { icon: Trophy, title: "Competitions", value: "Monthly Events", description: "Design challenges and hackathons" },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -8 }}
              >
                <Card className="text-center bg-slate-800/50 backdrop-blur-lg border-2 border-cyan-400/40 hover:border-cyan-400 hover:shadow-[0_0_60px_rgba(34,211,238,0.8)] hover:shadow-cyan-400/60 transition-all duration-300 rounded-2xl hover:bg-cyan-400/10">
                  <CardHeader>
                    <feature.icon className="w-12 h-12 mx-auto mb-4 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                    <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-2xl font-bold text-cyan-400">{feature.value}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Tabs */}
      <section ref={ref} className="py-20 bg-slate-900/30 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <Tabs defaultValue="forums" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-12 gap-2 h-auto bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 p-2 rounded-2xl">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col gap-2 py-4 data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-xl transition-all duration-300"
                >
                  <tab.icon className="w-5 h-5 data-[state=active]:drop-shadow-[0_0_15px_rgba(34,211,238,1)]" />
                  <span className="text-xs md:text-sm data-[state=active]:drop-shadow-[0_0_10px_rgba(34,211,238,1)]">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="forums">
              <div className="space-y-4">
                {forumTopics.map((topic, index) => (
                  <motion.div
                    key={topic.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: index * 0.1 }}
                  >
                  <Card className="bg-slate-800/50 backdrop-blur-lg border-2 border-cyan-400/30 hover:border-cyan-400 hover:shadow-[0_0_50px_rgba(34,211,238,0.9)] hover:shadow-cyan-400/70 transition-all duration-300 rounded-2xl hover:scale-[1.02]">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-grow">
                          <CardTitle className="text-xl mb-2 text-white">{topic.title}</CardTitle>
                          <CardDescription className="text-gray-300">
                            Posted by {topic.author} • {topic.category}
                          </CardDescription>
                        </div>
                        <div className="text-right text-sm text-gray-400 space-y-1 ml-4">
                          <div>{topic.replies} replies</div>
                          <div>{topic.views} views</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter>
                      <Button variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60">View Discussion</Button>
                    </CardFooter>
                  </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="projects">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentProjects.map((project, index) => (
                  <motion.div
                    key={project.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: index * 0.1 }}
                  >
                  <Card className="h-full flex flex-col bg-slate-800/50 backdrop-blur-lg border-2 border-cyan-400/30 hover:border-cyan-400 hover:shadow-[0_0_50px_rgba(34,211,238,0.9)] hover:shadow-cyan-400/70 transition-all duration-300 rounded-2xl hover:scale-[1.02]">
                    <CardHeader>
                      <div className="text-6xl mb-4 text-center">{project.image}</div>
                      <CardTitle className="text-xl text-white">{project.title}</CardTitle>
                      <CardDescription className="text-gray-300">By {project.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-gray-300 mb-4">{project.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{project.members} members</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60">View Project</Button>
                    </CardFooter>
                  </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="mentorship">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mentors.map((mentor, index) => (
                  <motion.div
                    key={mentor.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: index * 0.1 }}
                  >
                  <Card className="h-full bg-slate-800/50 backdrop-blur-lg border-2 border-cyan-400/30 hover:border-cyan-400 hover:shadow-[0_0_50px_rgba(34,211,238,0.9)] hover:shadow-cyan-400/70 transition-all duration-300 rounded-2xl hover:scale-[1.02]">
                    <CardHeader>
                      <div className="w-20 h-20 rounded-full bg-cyan-400/10 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-10 h-10 text-cyan-400" />
                      </div>
                      <CardTitle className="text-xl text-center text-white">{mentor.name}</CardTitle>
                      <CardDescription className="text-center text-gray-300">{mentor.expertise}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-2">
                      <p className="text-sm text-gray-400">{mentor.experience} experience</p>
                      <p className="text-sm font-medium text-cyan-400">{mentor.availability}</p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300">Request Mentorship</Button>
                    </CardFooter>
                  </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="events">
              <div className="space-y-6">
                {events.map((event, index) => (
                  <motion.div
                    key={event.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: index * 0.1 }}
                  >
                  <Card className="bg-slate-800/50 backdrop-blur-lg border-2 border-cyan-400/30 hover:border-cyan-400 hover:shadow-[0_0_50px_rgba(34,211,238,0.9)] hover:shadow-cyan-400/70 transition-all duration-300 rounded-2xl hover:scale-[1.02]">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                            <CardTitle className="text-xl text-white">{event.title}</CardTitle>
                            <span className="inline-block text-xs px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-400 w-fit">
                              {event.type}
                            </span>
                          </div>
                          <CardDescription className="mb-3 text-gray-300">{event.date}</CardDescription>
                          <p className="text-sm text-gray-300">{event.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter>
                      <Button variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60">Learn More</Button>
                    </CardFooter>
                  </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Join CTA */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Award className="w-16 h-16 mx-auto mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Become Part of AERORBIS
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join our global community of aerospace enthusiasts, students, and professionals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300">
                Join Discord Server
              </Button>
              <Button size="lg" variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60">
                Register Account
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Community;
