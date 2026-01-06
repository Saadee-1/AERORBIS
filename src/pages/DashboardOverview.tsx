import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { BookOpen, FlaskConical, Wrench, Users, ArrowRight, Rocket, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DashboardOverview = () => {
  // Future Integration: Connect to Database
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

  return (
    <DashboardLayout>
      {/* Welcome Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-8 rounded-2xl bg-gradient-to-r from-card via-primary/10 to-card border border-primary/30 shadow-[0_0_30px_rgba(255,215,0,0.2)] relative overflow-hidden text-center"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Rocket className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
            <span className="px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-xs font-bold text-primary uppercase tracking-wide">
              Aerospace Student
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Welcome back, Saad! 👋
          </h1>
          <p className="text-secondary text-lg font-medium">
            Keep exploring. Keep designing. Keep defying gravity.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Courses in Progress"
          value={stats.coursesInProgress}
          icon={BookOpen}
          trend="+1 this week"
        />
        <DashboardCard
          title="Research Submissions"
          value={stats.researchSubmissions}
          icon={FlaskConical}
          description="Featured articles"
        />
        <DashboardCard
          title="Tools Used"
          value={stats.toolsUsed}
          icon={Wrench}
          trend="12 times this month"
        />
        <DashboardCard
          title="Community Rank"
          value={stats.communityRank}
          icon={Users}
          trend="↑ 23 spots"
        />
      </div>

      {/* Quick Access Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center justify-center gap-3 uppercase tracking-wide">
          <Target className="w-6 h-6 text-primary" />
          Quick Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickAccessCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className={`h-full border-primary/30 bg-gradient-to-br ${card.gradient} hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all duration-300 group cursor-pointer text-center`}>
                <CardHeader className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-primary/20 border border-primary/40 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] transition-all">
                    <card.icon className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                  </div>
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
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Progress & Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
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
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - learningProgress / 100)}`}
                      className="text-primary drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                      {learningProgress}%
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-center text-secondary font-medium">
                You're making excellent progress! Keep it up! 🚀
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Latest Updates */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
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
                {recentUpdates.map((update) => (
                  <motion.div
                    key={update.id}
                    whileHover={{ x: 5 }}
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
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
