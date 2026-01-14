import { motion, useInView } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { BookOpen, FlaskConical, Wrench, Users, ArrowRight, Rocket, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef } from "react";

const DashboardOverview = () => {
  const welcomeRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const quickAccessRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const welcomeInView = useInView(welcomeRef, { once: true, margin: "-50px" as `${number}px` });
  const statsInView = useInView(statsRef, { once: true, margin: "-50px" as `${number}px` });
  const quickAccessInView = useInView(quickAccessRef, { once: true, margin: "-50px" as `${number}px` });
  const progressInView = useInView(progressRef, { once: true, margin: "-50px" as `${number}px` });

  const stats = {
    coursesInProgress: 3,
    researchSubmissions: 2,
    toolsUsed: 8,
    communityRank: "#142",
  };

  const learningProgress = 67;

  const recentUpdates = [
    { id: 1, title: "New Propulsion Module Released", type: "Course Update", time: "2h ago" },
    { id: 2, title: "Your research was featured!", type: "Achievement", time: "5h ago" },
    { id: 3, title: "Community Challenge: Design a Mars Lander", type: "Community", time: "1d ago" },
  ];

  const quickAccessCards = [
    {
      title: "Learn Hub",
      description: "Access study materials & lectures",
      icon: BookOpen,
      link: "/dashboard/learning",
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Research Lab",
      description: "Explore aerospace articles & papers",
      icon: FlaskConical,
      link: "/dashboard/research",
      gradient: "from-secondary/20 to-secondary/5",
    },
    {
      title: "Design Tools",
      description: "CAD, simulation & rocket analysis",
      icon: Wrench,
      link: "/dashboard/tools",
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Community Hub",
      description: "Join discussions & share projects",
      icon: Users,
      link: "/community",
      gradient: "from-secondary/20 to-secondary/5",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  return (
    <DashboardLayout>
      {/* Welcome Panel */}
      <motion.div
        ref={welcomeRef}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={welcomeInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 p-8 rounded-2xl bg-gradient-to-r from-card via-primary/10 to-card border border-primary/30 shadow-[0_0_30px_rgba(255,215,0,0.2)] relative overflow-hidden text-center"
      >
        {/* Decorative elements */}
        <motion.div 
          className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        
        <div className="relative z-10">
          <motion.div 
            className="flex items-center justify-center gap-3 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={welcomeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Rocket className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
            </motion.div>
            <span className="px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-xs font-bold text-primary uppercase tracking-wide">
              Aerospace Student
            </span>
          </motion.div>
          <motion.h1 
            className="text-4xl md:text-5xl font-bold text-foreground mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            initial={{ opacity: 0, y: 20 }}
            animate={welcomeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Welcome back, Saad! 👋
          </motion.h1>
          <motion.p 
            className="text-secondary text-lg font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={welcomeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Keep exploring. Keep designing. Keep defying gravity.
          </motion.p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        ref={statsRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate={statsInView ? "visible" : "hidden"}
      >
        {[
          { title: "Courses in Progress", value: stats.coursesInProgress, icon: BookOpen, trend: "+1 this week" },
          { title: "Research Submissions", value: stats.researchSubmissions, icon: FlaskConical, description: "Featured articles" },
          { title: "Tools Used", value: stats.toolsUsed, icon: Wrench, trend: "12 times this month" },
          { title: "Community Rank", value: stats.communityRank, icon: Users, trend: "↑ 23 spots" },
        ].map((stat, index) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <DashboardCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              trend={stat.trend}
              description={stat.description}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Access Cards */}
      <motion.div
        ref={quickAccessRef}
        initial={{ opacity: 0, y: 30 }}
        animate={quickAccessInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <motion.h2 
          className="text-2xl font-bold text-foreground mb-6 flex items-center justify-center gap-3 uppercase tracking-wide"
          initial={{ opacity: 0, x: -20 }}
          animate={quickAccessInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <Target className="w-6 h-6 text-primary" />
          Quick Access
        </motion.h2>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={quickAccessInView ? "visible" : "hidden"}
        >
          {quickAccessCards.map((card, index) => (
            <motion.div
              key={card.title}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -8,
                transition: { duration: 0.3 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className={`h-full border-primary/30 bg-gradient-to-br ${card.gradient} hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all duration-300 group cursor-pointer text-center`}>
                <CardHeader className="flex flex-col items-center">
                  <motion.div 
                    className="w-12 h-12 bg-primary/20 border border-primary/40 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] transition-all"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <card.icon className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                  </motion.div>
                  <CardTitle className="text-foreground font-bold uppercase text-sm tracking-wide">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-secondary font-medium">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-primary hover:bg-primary/20 hover:text-primary font-bold uppercase text-xs tracking-wider border border-primary/30 hover:border-primary/50"
                  >
                    Go
                    <motion.span
                      className="ml-2"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Progress & Updates */}
      <motion.div 
        ref={progressRef}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate={progressInView ? "visible" : "hidden"}
      >
        {/* Learning Progress */}
        <motion.div variants={itemVariants}>
          <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
            <CardHeader>
              <CardTitle className="text-foreground font-bold uppercase text-lg tracking-wide flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Learning Progress
              </CardTitle>
              <CardDescription className="text-secondary font-medium">
                Overall completion across all courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-40 h-40">
                  <svg className="transform -rotate-90 w-40 h-40">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-muted"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeLinecap="round"
                      className="text-primary drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"
                      initial={{ strokeDasharray: `${2 * Math.PI * 70}`, strokeDashoffset: `${2 * Math.PI * 70}` }}
                      animate={progressInView ? { 
                        strokeDashoffset: `${2 * Math.PI * 70 * (1 - learningProgress / 100)}` 
                      } : {}}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    />
                  </svg>
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={progressInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.6, delay: 1 }}
                  >
                    <span className="text-4xl font-bold text-primary drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                      {learningProgress}%
                    </span>
                  </motion.div>
                </div>
              </div>
              <p className="text-center text-secondary font-medium">
                You're making excellent progress! Keep it up! 🚀
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Latest Updates */}
        <motion.div variants={itemVariants}>
          <Card className="border-primary/30 bg-gradient-to-br from-card to-secondary/5 shadow-[0_0_20px_rgba(135,206,235,0.15)]">
            <CardHeader>
              <CardTitle className="text-foreground font-bold uppercase text-lg tracking-wide flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Latest Updates
              </CardTitle>
              <CardDescription className="text-secondary font-medium">
                Recent announcements and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUpdates.map((update, index) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={progressInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
                    whileHover={{ x: 5, backgroundColor: "rgba(34, 211, 238, 0.05)" }}
                    className="p-4 rounded-lg bg-muted/30 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(255,215,0,0.2)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-foreground text-sm">{update.title}</h4>
                      <span className="text-xs text-secondary font-medium">{update.time}</span>
                    </div>
                    <span className="inline-block px-2 py-1 bg-primary/20 border border-primary/30 rounded text-xs font-bold text-primary uppercase tracking-wide">
                      {update.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
