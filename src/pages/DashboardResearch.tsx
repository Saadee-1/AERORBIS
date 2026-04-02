import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Calendar, Eye, Edit } from "lucide-react";
import { toast } from "sonner";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const DashboardResearch = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const headerInView = useInView(headerRef, { once: true, margin: "-50px" as `${number}px` });
  const listInView = useInView(listRef, { once: true, margin: "-50px" as `${number}px` });
  const statsInView = useInView(statsRef, { once: true, margin: "-50px" as `${number}px` });

  const research = [
    { id: 1, title: "Optimization of Wing Design for Hypersonic Flight", category: "Aerodynamics", status: "Featured", uploadDate: "2024-01-15", abstract: "This research explores novel approaches to wing geometry optimization for sustained hypersonic flight conditions..." },
    { id: 2, title: "Advanced Ion Propulsion Systems", category: "Propulsion", status: "Approved", uploadDate: "2024-01-20", abstract: "An in-depth analysis of ion propulsion efficiency improvements through magnetic field manipulation..." },
    { id: 3, title: "Composite Materials for Spacecraft Structures", category: "Structures", status: "Pending", uploadDate: "2024-01-25", abstract: "Investigation of carbon-fiber reinforced polymers under extreme temperature variations in space environments..." },
  ];

  const getStatusStyle = (status: string) => {
    if (status === "Featured") return "bg-primary/10 text-primary border-primary/30";
    if (status === "Approved") return "bg-green-400/10 text-green-400 border-green-400/30";
    return "bg-muted/10 text-muted-foreground border-muted/20";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div
        ref={headerRef}
        className="flex flex-col items-center text-center mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4">
          <p className="text-[10px] text-primary/60 tracking-[0.3em] uppercase mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            // Research Division
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            My <span className="text-primary drop-shadow-[0_0_15px_hsl(160_84%_39%/0.4)]">Research</span>
          </h1>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Manage and submit your aerospace research
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-xs tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Submit New Research
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent className="bg-slate-950/95 backdrop-blur-xl border-primary/20 max-w-2xl">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50" />
            <DialogHeader>
              <DialogTitle className="text-foreground text-sm tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                // Submit New Research
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-muted-foreground text-[11px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Research Title</Label>
                <Input id="title" placeholder="Enter research title" className="bg-slate-800/30 border-primary/15 text-foreground text-sm" />
              </div>
              <div>
                <Label htmlFor="category" className="text-muted-foreground text-[11px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Category</Label>
                <Select>
                  <SelectTrigger className="bg-slate-800/30 border-primary/15 text-foreground text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950/95 backdrop-blur-xl border-primary/20">
                    <SelectItem value="aerodynamics">Aerodynamics</SelectItem>
                    <SelectItem value="propulsion">Propulsion</SelectItem>
                    <SelectItem value="structures">Structures</SelectItem>
                    <SelectItem value="avionics">Avionics</SelectItem>
                    <SelectItem value="space">Space Systems</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="abstract" className="text-muted-foreground text-[11px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Abstract / Summary</Label>
                <Textarea id="abstract" placeholder="Provide a brief summary..." className="bg-slate-800/30 border-primary/15 text-foreground min-h-32 text-sm" />
              </div>
              <div>
                <Label htmlFor="file" className="text-muted-foreground text-[11px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Upload PDF</Label>
                <Input id="file" type="file" accept=".pdf" className="bg-slate-800/30 border-primary/15 text-foreground text-sm" />
              </div>
              <Button className="w-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-xs tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }} onClick={() => toast.info("🚀 Coming Soon — Research submission portal is under development!")}>
                Submit Research
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Research List */}
      <motion.div
        ref={listRef}
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate={listInView ? "visible" : "hidden"}
      >
        {research.map((item) => (
          <motion.div key={item.id} variants={itemVariants} whileHover={{ scale: 1.01, x: 6 }}>
            <div className="relative rounded-xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-lg" />
              <div className="absolute inset-0 rounded-xl border border-primary/10 group-hover:border-primary/30 transition-colors" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30" />

              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-foreground tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {item.title}
                      </h3>
                      <Badge className={`${getStatusStyle(item.status)} text-[9px] tracking-wider uppercase border`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">{item.abstract}</p>
                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="ghost" size="sm" className="text-primary/70 hover:text-primary hover:bg-primary/10 border border-primary/15 text-[10px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }} onClick={() => toast.info("🚀 Coming Soon!")}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="ghost" size="sm" className="text-primary/70 hover:text-primary hover:bg-primary/10 border border-primary/15 text-[10px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }} onClick={() => toast.info("🚀 Coming Soon!")}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Stats */}
      <motion.div
        ref={statsRef}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
        variants={containerVariants}
        initial="hidden"
        animate={statsInView ? "visible" : "hidden"}
      >
        {[
          { value: "5", label: "Total Submissions", unit: "PUB" },
          { value: "1", label: "Featured Research", unit: "FTR" },
          { value: "234", label: "Total Views", unit: "VIS" },
        ].map((stat) => (
          <motion.div key={stat.label} variants={itemVariants} whileHover={{ scale: 1.03, y: -3 }}>
            <div className="relative rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg" />
              <div className="absolute inset-0 rounded-xl border border-primary/15" />
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/30" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/30" />

              <div className="relative p-5 text-center">
                <p className="text-[9px] text-primary/50 tracking-[0.3em] uppercase mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  [{stat.unit}]
                </p>
                <motion.p
                  className="text-3xl font-bold text-primary mb-1"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                  initial={{ scale: 0.5 }}
                  animate={statsInView ? { scale: 1 } : { scale: 0.5 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-[11px] text-muted-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {stat.label}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardResearch;
