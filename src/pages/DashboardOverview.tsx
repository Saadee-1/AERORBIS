import { motion, useInView } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { BookOpen, FlaskConical, Wrench, Users, ArrowRight, Rocket, Target, Activity, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const DashboardOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("Engineer");

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('profiles').select('display_name, username').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setDisplayName(data.display_name || data.username || 'Engineer');
      });
  }, [user, navigate]);

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
    { id: 1, title: "New Propulsion Module Released", type: "SYS-UPDATE", time: "2h ago" },
    { id: 2, title: "Your research was featured!", type: "ACHIEVEMENT", time: "5h ago" },
    { id: 3, title: "Community Challenge: Design a Mars Lander", type: "MISSION", time: "1d ago" },
  ];

  const quickAccessCards = [
    { title: "Training Modules", description: "Access study materials & lectures", icon: BookOpen, link: "/dashboard/learning" },
    { title: "Research Lab", description: "Explore aerospace articles & papers", icon: FlaskConical, link: "/dashboard/research" },
    { title: "Simulation Bay", description: "CAD, simulation & rocket analysis", icon: Wrench, link: "/dashboard/tools" },
    { title: "Comm Channel", description: "Join discussions & share projects", icon: Users, link: "/community" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  return (
    <DashboardLayout>
      {/* Welcome Panel */}
      <motion.div
        ref={welcomeRef}
        initial={{ opacity: 0, y: 40 }}
        animate={welcomeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 p-8 rounded-xl relative overflow-hidden text-center"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 via-primary/5 to-slate-800/50 backdrop-blur-lg" />
        <div className="absolute inset-0 rounded-xl border border-primary/20" />
        <div className="absolute inset-0 grid-overlay opacity-20" />
        
        {/* HUD corners */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/50" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/50" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50" />

        {/* Decorative elements */}
        <motion.div
          className="absolute top-4 right-4 text-[9px] text-primary/40 tracking-[0.3em] uppercase"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          SYS.ACTIVE
        </motion.div>

        <div className="relative z-10">
          <motion.div
            className="flex items-center justify-center gap-3 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={welcomeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Rocket className="w-7 h-7 text-primary drop-shadow-[0_0_10px_hsl(160_84%_39%/0.6)]" />
            </motion.div>
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-[10px] font-semibold text-primary uppercase tracking-[0.2em]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Clearance Level 3
            </span>
          </motion.div>
          <motion.h1
            className="text-3xl md:text-4xl font-bold text-foreground mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
            initial={{ opacity: 0, y: 20 }}
            animate={welcomeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Welcome back, <span className="text-primary drop-shadow-[0_0_15px_hsl(160_84%_39%/0.5)]">{displayName}</span>
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-sm"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate={statsInView ? "visible" : "hidden"}
      >
        {[
          { title: "Active Courses", value: stats.coursesInProgress, icon: BookOpen, trend: "+1 this week" },
          { title: "Research Papers", value: stats.researchSubmissions, icon: FlaskConical, description: "Featured articles" },
          { title: "Simulations Run", value: stats.toolsUsed, icon: Wrench, trend: "12 this month" },
          { title: "Global Rank", value: stats.communityRank, icon: Users, trend: "↑ 23 positions" },
        ].map((stat) => (
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
        <div className="flex items-center gap-3 mb-5">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-sm text-primary tracking-[0.2em] uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            // Quick Access Stations
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
        </div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate={quickAccessInView ? "visible" : "hidden"}
        >
          {quickAccessCards.map((card) => (
            <motion.div
              key={card.title}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to={card.link}>
                <div className="relative h-full rounded-xl p-5 cursor-pointer group overflow-hidden">
                  {/* Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg" />
                  <div className="absolute inset-0 rounded-xl border border-primary/10 group-hover:border-primary/30 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* HUD corners */}
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/30 group-hover:border-primary/60 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/30 group-hover:border-primary/60 transition-colors" />

                  <div className="relative z-10 text-center">
                    <motion.div
                      className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center mb-3 mx-auto group-hover:shadow-[0_0_12px_hsl(160_84%_39%/0.2)] transition-shadow"
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <card.icon className="w-5 h-5 text-primary" />
                    </motion.div>
                    <h3 className="text-sm font-semibold text-foreground mb-1 tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mb-3">{card.description}</p>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-primary/70 tracking-wider uppercase group-hover:text-primary transition-colors" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      <span>Access</span>
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight className="w-3 h-3" />
                      </motion.span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Progress & Updates */}
      <motion.div
        ref={progressRef}
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        variants={containerVariants}
        initial="hidden"
        animate={progressInView ? "visible" : "hidden"}
      >
        {/* Learning Progress */}
        <motion.div variants={itemVariants}>
          <div className="relative rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/60 backdrop-blur-lg" />
            <div className="absolute inset-0 rounded-xl border border-primary/15" />
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/40" />

            <div className="relative p-6">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-[11px] text-primary tracking-[0.2em] uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  // Training Progress
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-6" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Overall completion across all modules
              </p>

              <div className="flex items-center justify-center mb-6">
                <div className="relative w-36 h-36">
                  <svg className="transform -rotate-90 w-36 h-36">
                    <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                    <motion.circle
                      cx="72" cy="72" r="64"
                      stroke="url(#progressGrad)"
                      strokeWidth="8"
                      fill="transparent"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: `${2 * Math.PI * 64}`, strokeDashoffset: `${2 * Math.PI * 64}` }}
                      animate={progressInView ? { strokeDashoffset: `${2 * Math.PI * 64 * (1 - learningProgress / 100)}` } : {}}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(160 84% 39%)" />
                        <stop offset="100%" stopColor="hsl(140 70% 45%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <motion.div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={progressInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.6, delay: 1 }}
                  >
                    <span className="text-3xl font-bold text-primary" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {learningProgress}%
                    </span>
                    <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      Complete
                    </span>
                  </motion.div>
                </div>
              </div>

              <p className="text-center text-[11px] text-muted-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Excellent trajectory — maintain current pace 🚀
              </p>
            </div>
          </div>
        </motion.div>

        {/* Latest Updates */}
        <motion.div variants={itemVariants}>
          <div className="relative rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/60 backdrop-blur-lg" />
            <div className="absolute inset-0 rounded-xl border border-primary/15" />
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/40" />

            <div className="relative p-6">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-primary" />
                <h3 className="text-[11px] text-primary tracking-[0.2em] uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  // Incoming Transmissions
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Recent announcements and achievements
              </p>

              <div className="space-y-3">
                {recentUpdates.map((update, index) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={progressInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
                    whileHover={{ x: 4, backgroundColor: "rgba(34, 211, 238, 0.03)" }}
                    className="p-3 rounded-lg bg-muted/10 border border-primary/10 hover:border-primary/25 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h4 className="text-sm font-medium text-foreground">{update.title}</h4>
                      <span className="text-[10px] text-muted-foreground tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {update.time}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] font-semibold text-primary tracking-[0.15em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {update.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
