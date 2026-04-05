import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, MapPin, Phone, Linkedin, Youtube, Github, Instagram, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import PageBreadcrumb from "@/components/PageBreadcrumb";

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

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "" as string,
    calculator: "" as string,
    subject: "",
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
          subject: formData.subject || undefined,
          message: formData.message,
        }),
      });
      if (!response.ok) throw new Error('Failed');
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", category: "", calculator: "", subject: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const socialLinks = [
    { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/sahad-ahmad-ist", color: "hover:text-[#0077b5]" },
    { icon: Youtube, label: "YouTube", href: "#", color: "hover:text-[#ff0000]" },
    { icon: Github, label: "GitHub", href: "#", color: "hover:text-[#333333]" },
    { icon: Instagram, label: "Instagram", href: "#", color: "hover:text-[#e4405f]" },
  ];

  const contactInfo = [
    { icon: MapPin, label: "Location", value: "Virtual • Global Community" },
  ];

  const inputClass = "bg-background/50 border-primary/20 text-foreground";
  const selectClass = "w-full rounded-md px-3 py-2 text-sm border transition-all focus:outline-none cursor-pointer bg-[#0a0f1a] border-[rgba(0,255,180,0.2)] text-[#e2e8f0] focus:border-[rgba(0,255,180,0.6)] focus:shadow-[0_0_8px_rgba(0,255,180,0.15)] [&>option]:bg-[#0a0f1a] [&>option]:text-[#e2e8f0] [&>option:hover]:bg-[rgba(0,255,180,0.08)] [-webkit-appearance:none] [-moz-appearance:none] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2300ffb4%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9";

  return (
    <div className="min-h-screen flex flex-col relative">
      <PageBreadcrumb />
      
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
            <Mail className="w-16 h-16 mx-auto mb-6 text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.8)]" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Contact AERORBIS
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              We'd love to hear from you
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="bg-card/50 backdrop-blur-lg border border-primary/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-foreground">Send us a Message</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Fill out the form below and we'll get back to you as soon as possible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground">Full Name *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className={inputClass} />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-foreground">Category *</Label>
                      <select
                        id="category"
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
                        <Label htmlFor="calculator" className="text-foreground">Calculator</Label>
                        <select
                          id="calculator"
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

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-foreground">Subject</Label>
                      <Input id="subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-foreground">Message *</Label>
                      <Textarea id="message" rows={6} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required className={inputClass} />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={sending}>
                      {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-8">
              <Card className="bg-card/50 backdrop-blur-lg border border-primary/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-foreground">Contact Information</CardTitle>
                  <CardDescription className="text-muted-foreground">Reach out through any of these channels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-foreground">{item.label}</p>
                        <p className="text-muted-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-lg border border-primary/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-foreground">Follow Us</CardTitle>
                  <CardDescription className="text-muted-foreground">Join our community on social media</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {socialLinks.map((social) => (
                      <motion.a key={social.label} href={social.href} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`flex items-center gap-3 p-4 rounded-lg bg-background/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all ${social.color}`}>
                        <social.icon className="w-6 h-6" />
                        <span className="font-medium text-foreground">{social.label}</span>
                      </motion.a>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-lg border border-primary/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-foreground">Support Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monday - Friday</span>
                    <span className="font-semibold text-foreground">9:00 AM - 6:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weekend</span>
                    <span className="font-semibold text-foreground">Closed</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">We typically respond within 24 hours during business days</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">Global Community, Local Impact</h2>
            <div className="relative h-96 bg-card/50 backdrop-blur-lg border border-primary/20 rounded-2xl flex items-center justify-center overflow-hidden">
              <div className="relative z-10 text-center">
                <MapPin className="w-24 h-24 mx-auto mb-4 text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.8)]" />
                <p className="text-xl text-muted-foreground max-w-md mx-auto">
                  Connecting aerospace enthusiasts from every corner of the globe
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
