import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Linkedin, Youtube, Github, Instagram } from "lucide-react";
import { toast } from "sonner";
import { useActiveSection } from "@/hooks/useActiveSection";

const Contact = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "contact";
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", message: "" });
  };

  const socials = [
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

  return (
    <section 
      id="contact" 
      className={`py-24 bg-gradient-to-b from-black via-slate-900 to-black relative overflow-hidden transition-all duration-500 ${
        isActive ? "shadow-[inset_0_0_100px_rgba(34,211,238,0.4)] border-t-4 border-b-4 border-cyan-400/50" : ""
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">Get in Touch</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 text-white placeholder:text-gray-400"
              />
              <Input
                type="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 text-white placeholder:text-gray-400"
              />
            </div>
            <Textarea
              placeholder="Your Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={6}
              className="bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 text-white placeholder:text-gray-400 resize-none"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"
            >
              Send Message
            </Button>
          </form>

          <div className="flex justify-center gap-6 mt-12">
            {socials.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 rounded-full bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 flex items-center justify-center hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300"
              >
                <social.icon className="w-5 h-5 text-cyan-400" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
