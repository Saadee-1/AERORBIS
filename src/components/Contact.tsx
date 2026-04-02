import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Linkedin, Youtube, Github, Instagram, Send, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from('contact_messages').insert({
      name: formData.name,
      email: formData.email,
      subject: 'Homepage Contact',
      message: formData.message,
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send. Please try again.");
    } else {
      toast.success("Transmission sent! We'll respond shortly.");
      setFormData({ name: "", email: "", message: "" });
    }
  };

  const socials = [
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

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
                  placeholder="Callsign (Name)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                />
                <Input
                  type="email"
                  placeholder="Frequency (Email)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                />
              </div>
              <Textarea
                placeholder="Your Transmission..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={6}
                className="bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 resize-none focus:border-primary/50 focus:ring-primary/20 transition-all"
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
