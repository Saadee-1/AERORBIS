import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Linkedin, Youtube, Github, Instagram, Send, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CATEGORIES = [
  "Calculator Bug",
  "Calculator Suggestion",
  "Request a New Calculator",
  "General Feedback",
] as const;

const CALCULATORS = [
  "Thrust Calculator -- Aircraft Thrust",
  "Thrust Calculator -- Rocket Thrust",
  "Lift-to-Drag Ratio Analyzer",
  "Orbital Path Visualizer",
  "Material Density Database",
  "Wing Loading Calculator",
  "Delta-V Budget Planner",
  "Antenna Pattern Analyzer",
  "Reynolds Number Calculator",
  "Standard Atmosphere Calculator",
  "Rocket Engine Performance",
  "Stability & Control Derivatives",
  "Battery & Solar Power System",
  "Structural Weight Estimator",
  "Rocket Trajectory Simulator",
  "Climb Performance Calculator",
  "Other",
] as const;

const CALC_CATEGORIES = ["Calculator Bug", "Calculator Suggestion"] as const;

const Contact = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "" as string,
    calculator: "" as string,
    message: "",
  });
  const [sending, setSending] = useState(false);

  const showCalculator = CALC_CATEGORIES.includes(formData.category as typeof CALC_CATEGORIES[number]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error("Please select a category.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          category: formData.category,
          calculator: showCalculator ? formData.calculator : undefined,
          subject: undefined,
          message: formData.message,
        }),
      });
      if (!response.ok) throw new Error('Failed');
      toast.success("Transmission sent! We'll respond shortly.");
      setFormData({ name: "", email: "", category: "", calculator: "", message: "" });
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const socials = [
    { icon: Linkedin, href: "https://www.linkedin.com/in/sahad-ahmad-ist", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

  const inputClass = "bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all";
  const selectClass = "w-full rounded-md px-3 py-2 text-sm border transition-all focus:outline-none cursor-pointer bg-[#0a0f1a] border-[rgba(0,255,180,0.2)] text-[#e2e8f0] focus:border-[rgba(0,255,180,0.6)] focus:shadow-[0_0_8px_rgba(0,255,180,0.15)] [&>option]:bg-[#0a0f1a] [&>option]:text-[#e2e8f0] [&>option:hover]:bg-[rgba(0,255,180,0.08)] [-webkit-appearance:none] [-moz-appearance:none] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2300ffb4%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9";

  return (
    <section id="contact" className="py-16 sm:py-28 bg-transparent relative">
      <div className="section-divider mb-16 sm:mb-28" />
      <div ref={ref} className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-hud text-xs mb-4 block">// Open Channel</span>
          <h2 className="heading-1 text-foreground mb-4">Get in Touch</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Have questions? Send a transmission — we'd love to hear from you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-card/30 backdrop-blur-xl border border-border/40 rounded-lg p-4 sm:p-8 hud-corners">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <Input
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={inputClass}
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value, calculator: "" })}
                  required
                  className={selectClass}
                >
                  <option value="" disabled>Select a category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Calculator dropdown */}
              {showCalculator && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Calculator</label>
                  <select
                    value={formData.calculator}
                    onChange={(e) => setFormData({ ...formData, calculator: e.target.value })}
                    className={selectClass}
                  >
                    <option value="" disabled>Select a calculator...</option>
                    {CALCULATORS.map((calc) => (
                      <option key={calc} value={calc}>{calc}</option>
                    ))}
                  </select>
                </div>
              )}

              <Textarea
                placeholder="Your message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={6}
                className={`${inputClass} resize-none`}
              />
              <Button type="submit" size="lg" className="w-full gap-2 glow-cyan font-semibold tracking-wide" disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending..." : "Send Transmission"}
              </Button>
            </form>
          </div>

          <div className="flex flex-col items-center gap-4 mt-10">
            <Button asChild variant="outline" className="border-primary/30 hover:border-primary/60 hover:bg-primary/5 gap-2">
              <Link to="/contact">
                Full Contact Page <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex justify-center gap-4">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-11 h-11 rounded-lg bg-card/40 border border-border/40 flex items-center justify-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_0_15px_hsl(160_84%_39%/0.15)] group"
                >
                  <social.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
