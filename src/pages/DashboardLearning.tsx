import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, BookOpen, Clock, Flame, Zap } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { toast } from "sonner";
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
    { id: 1, title: "Aerodynamics 101", category: "Aerodynamics", difficulty: "Beginner", progress: 75, totalLessons: 12, completedLessons: 9, thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400", timeRemaining: "2 hours" },
    { id: 2, title: "Rocket Propulsion Systems", category: "Propulsion", difficulty: "Intermediate", progress: 45, totalLessons: 15, completedLessons: 7, thumbnail: "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400", timeRemaining: "5 hours" },
    { id: 3, title: "Orbital Mechanics", category: "Space Systems", difficulty: "Advanced", progress: 30, totalLessons: 20, completedLessons: 6, thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400", timeRemaining: "12 hours" },
  ];

  const badges = [
    { name: "Aero Apprentice", icon: "🎯", earned: true },
    { name: "Propulsion Pro", icon: "🚀", earned: true },
    { name: "5 Day Streak", icon: "🔥", earned: true },
    { name: "Research Contrib", icon: "📝", earned: false },
    { name: "Orbital Master", icon: "🌌", earned: false },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  const getDifficultyColor = (d: string) => {
    if (d === "Beginner") return "bg-green-400/10 text-green-400 border-green-400/30";
    if (d === "Intermediate") return "bg-amber-400/10 text-amber-400 border-amber-400/30";
    return "bg-red-400/10 text-red-400 border-red-400/30";
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
        <p className="text-[10px] text-primary/60 tracking-[0.3em] uppercase mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          // Training Division
        </p>
        <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Learning <span className="text-primary drop-shadow-[0_0_15px_hsl(160_84%_39%/0.4)]">Progress</span>
        </h1>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Track your aerospace education trajectory
        </p>
      </motion.div>

      {/* Streak Counter */}
      <motion.div
        ref={streakRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={streakInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-xl overflow-hidden mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 via-primary/5 to-slate-800/50 backdrop-blur-lg" />
        <div className="absolute inset-0 rounded-xl border border-primary/20" />
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/40" />

        <div className="relative p-6 flex flex-col items-center text-center space-y-3">
          <motion.div
            className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0px hsl(160 84% 39% / 0)', '0 0 20px hsl(160 84% 39% / 0.3)', '0 0 0px hsl(160 84% 39% / 0)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="w-7 h-7 text-primary" />
          </motion.div>
          <div>
            <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              5 Day Streak
            </h3>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Consecutive days of training — keep the momentum
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Button className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-xs tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <Zap className="w-3 h-3 mr-1.5" />
              View Achievements
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-8">
        <TabsList className="bg-slate-800/30 backdrop-blur-lg border border-primary/10">
          {["all", "beginner", "intermediate", "advanced"].map((val) => (
            <TabsTrigger
              key={val}
              value={val}
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/30 text-[11px] tracking-wider uppercase"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              {val === "all" ? "All Modules" : val}
            </TabsTrigger>
          ))}
        </TabsList>

        {["all", "beginner", "intermediate", "advanced"].map((tabValue) => {
          const filteredModules = tabValue === "all" 
            ? modules 
            : modules.filter(m => m.difficulty.toLowerCase() === tabValue);

          return (
            <TabsContent key={tabValue} value={tabValue} className="mt-6">
              <motion.div
                ref={tabValue === "all" ? modulesRef : null}
                className="grid grid-cols-1 lg:grid-cols-2 gap-5"
                variants={containerVariants}
                initial="hidden"
                animate={modulesInView ? "visible" : "hidden"}
              >
                {filteredModules.length > 0 ? (
                  filteredModules.map((module) => (
                    <motion.div
                      key={module.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, y: -4 }}
                    >
                      <div className="relative rounded-xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-lg" />
                        <div className="absolute inset-0 rounded-xl border border-primary/10 group-hover:border-primary/30 transition-colors" />
                        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30" />

                        {/* Thumbnail */}
                        <div className="h-36 bg-cover bg-center relative" style={{ backgroundImage: `url(${module.thumbnail})` }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                          <div className="absolute bottom-3 left-3">
                            <Badge className={`${getDifficultyColor(module.difficulty)} text-[10px] tracking-wider uppercase border`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                              {module.difficulty}
                            </Badge>
                          </div>
                          <div className="absolute top-3 right-3 text-[9px] text-primary/50 tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            {module.category}
                          </div>
                        </div>

                        <div className="relative p-5">
                          <h3 className="text-base font-semibold text-foreground mb-3 tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            {module.title}
                          </h3>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-[11px] mb-1.5">
                                <span className="text-muted-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Progress</span>
                                <span className="text-primary font-semibold" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}>{module.progress}%</span>
                              </div>
                              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-info"
                                  initial={{ width: 0 }}
                                  animate={modulesInView ? { width: `${module.progress}%` } : { width: 0 }}
                                  transition={{ duration: 1, delay: 0.3 }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>{module.completedLessons}/{module.totalLessons}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{module.timeRemaining}</span>
                              </span>
                            </div>

                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button className="w-full bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 text-[11px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }} onClick={() => toast.info("🚀 Coming Soon — Module content is under development!")}>
                                Coming Soon →
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center text-muted-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    <p className="tracking-wider uppercase">No modules available in this category.</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Badges */}
      <motion.div
        ref={badgesRef}
        initial={{ opacity: 0, y: 40 }}
        animate={badgesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg" />
          <div className="absolute inset-0 rounded-xl border border-primary/15" />
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/40" />

          <div className="relative p-6">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="text-[11px] text-primary tracking-[0.2em] uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                // Earned Certifications
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
            </div>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-5 gap-3"
              variants={containerVariants}
              initial="hidden"
              animate={badgesInView ? "visible" : "hidden"}
            >
              {badges.map((badge) => (
                <motion.div
                  key={badge.name}
                  variants={itemVariants}
                  whileHover={{ scale: badge.earned ? 1.08 : 1, y: badge.earned ? -3 : 0 }}
                  className={`p-4 rounded-lg text-center transition-all duration-300 border ${
                    badge.earned
                      ? "bg-primary/5 border-primary/20 hover:shadow-[0_0_15px_hsl(160_84%_39%/0.1)]"
                      : "bg-muted/5 border-muted/10 opacity-40"
                  }`}
                >
                  <motion.div
                    className="text-3xl mb-2"
                    animate={badge.earned ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {badge.icon}
                  </motion.div>
                  <p className="text-[10px] font-medium text-foreground/80 tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {badge.name}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardLearning;
