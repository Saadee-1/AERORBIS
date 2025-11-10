import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, BookOpen, Clock, Flame } from "lucide-react";
import { motion } from "framer-motion";

const DashboardLearning = () => {
  // Mock data - Future Integration: Connect to Database
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">Learning Progress</h1>
        <p className="text-gray-400">Track your aerospace education journey</p>
      </div>

      {/* Streak Counter */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/30 rounded-2xl p-6 mb-8 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black w-16 h-16 rounded-full flex items-center justify-center text-2xl">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">5 Day Streak!</h3>
              <p className="text-gray-300">You've studied 5 days in a row — keep going!</p>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">View Achievements</Button>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
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
                      <Button className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                        Continue Learning →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Badges Section */}
      <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Award className="w-5 h-5 text-cyan-400" />
            <span>Your Achievements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {badges.map((badge, index) => (
              <motion.div
                key={badge.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg text-center transition-all duration-300 ${
                  badge.earned
                    ? "bg-cyan-400/10 border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                    : "bg-slate-900/50 border border-slate-700/30 opacity-50"
                }`}
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <p className="text-xs font-medium text-gray-300">{badge.name}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default DashboardLearning;
