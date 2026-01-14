import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, BookOpen, Clock, Flame } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const DashboardLearning = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const modulesRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  const headerInView = useInView(headerRef, { once: true, margin: "-50px" as `${number}px` });
  const streakInView = useInView(streakRef, { once: true, margin: "-50px" as `${number}px` });
  const modulesInView = useInView(modulesRef, { once: true, margin: "-50px" as `${number}px` });
  const badgesInView = useInView(badgesRef, { once: true, margin: "-50px" as `${number}px` });

  const modules = [
    {
      id: 1,
      title: "Aerodynamics 101",
      category: "Aerodynamics",
      difficulty: "Beginner",
      progress: 75,
      totalLessons: 12,
      completedLessons: 9,
      thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
      timeRemaining: "2 hours",
    },
    {
      id: 2,
      title: "Rocket Propulsion Systems",
      category: "Propulsion",
      difficulty: "Intermediate",
      progress: 45,
      totalLessons: 15,
      completedLessons: 7,
      thumbnail: "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400",
      timeRemaining: "5 hours",
    },
    {
      id: 3,
      title: "Orbital Mechanics",
      category: "Space Systems",
      difficulty: "Advanced",
      progress: 30,
      totalLessons: 20,
      completedLessons: 6,
      thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400",
      timeRemaining: "12 hours",
    },
  ];

  const badges = [
    { name: "Aerodynamics Apprentice", icon: "🎯", earned: true },
    { name: "Propulsion Pro", icon: "🚀", earned: true },
    { name: "5 Day Streak", icon: "🔥", earned: true },
    { name: "Research Contributor", icon: "📝", earned: false },
    { name: "Orbital Master", icon: "🌌", earned: false },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div 
        ref={headerRef}
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">Learning Progress</h1>
        <p className="text-gray-400">Track your aerospace education journey</p>
      </motion.div>

      {/* Streak Counter */}
      <motion.div
        ref={streakRef}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={streakInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/30 rounded-2xl p-6 mb-8 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <motion.div 
            className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="w-8 h-8" />
          </motion.div>
          <div>
            <motion.h3 
              className="text-2xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={streakInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.3 }}
            >
              5 Day Streak!
            </motion.h3>
            <motion.p 
              className="text-gray-300"
              initial={{ opacity: 0 }}
              animate={streakInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.4 }}
            >
              You've studied 5 days in a row — keep going!
            </motion.p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">
              View Achievements
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs for filtering */}
      <Tabs defaultValue="all" className="mb-8">
        <TabsList className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20">
          <TabsTrigger value="all" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400">All Courses</TabsTrigger>
          <TabsTrigger value="beginner" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400">Beginner</TabsTrigger>
          <TabsTrigger value="intermediate" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400">Intermediate</TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <motion.div 
            ref={modulesRef}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate={modulesInView ? "visible" : "hidden"}
          >
            {modules.map((module) => (
              <motion.div
                key={module.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl overflow-hidden hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:border-cyan-400/60 transition-all duration-300">
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${module.thumbnail})` }}
                  >
                    <div className="h-full bg-gradient-to-t from-slate-900 to-transparent flex items-end p-4">
                      <Badge className="bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">{module.difficulty}</Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-white">{module.title}</CardTitle>
                    <p className="text-sm text-gray-400">{module.category}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-cyan-400 font-medium">{module.progress}%</span>
                        </div>
                        <Progress value={module.progress} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4 text-gray-400">
                          <span className="flex items-center space-x-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{module.completedLessons}/{module.totalLessons} lessons</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{module.timeRemaining}</span>
                          </span>
                        </div>
                      </div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                          Continue Learning →
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Badges Section */}
      <motion.div
        ref={badgesRef}
        initial={{ opacity: 0, y: 40 }}
        animate={badgesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Award className="w-5 h-5 text-cyan-400" />
              <span>Your Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-5 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate={badgesInView ? "visible" : "hidden"}
            >
              {badges.map((badge) => (
                <motion.div
                  key={badge.name}
                  variants={itemVariants}
                  whileHover={{ scale: badge.earned ? 1.1 : 1, y: badge.earned ? -5 : 0 }}
                  className={`p-4 rounded-lg text-center transition-all duration-300 ${
                    badge.earned
                      ? "bg-cyan-400/10 border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                      : "bg-slate-900/50 border border-slate-700/30 opacity-50"
                  }`}
                >
                  <motion.div 
                    className="text-4xl mb-2"
                    animate={badge.earned ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {badge.icon}
                  </motion.div>
                  <p className="text-xs font-medium text-gray-300">{badge.name}</p>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardLearning;
