import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, MapPin, Phone, Linkedin, Youtube, Github, Instagram } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";
import PageBreadcrumb from "@/components/PageBreadcrumb";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent successfully! We'll get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const socialLinks = [
    { icon: Linkedin, label: "LinkedIn", href: "#", color: "hover:text-[#0077b5]" },
    { icon: Youtube, label: "YouTube", href: "#", color: "hover:text-[#ff0000]" },
    { icon: Github, label: "GitHub", href: "#", color: "hover:text-[#333333]" },
    { icon: Instagram, label: "Instagram", href: "#", color: "hover:text-[#e4405f]" },
  ];

  const contactInfo = [
    { icon: Mail, label: "Email", value: "hello@aeroverse.space" },
    { icon: Phone, label: "Phone", value: "+1 (555) 123-4567" },
    { icon: MapPin, label: "Location", value: "Virtual • Global Community" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-black via-slate-900 to-black relative">
      <DeepSpaceDataBackground />
      <Navbar />
      <PageBreadcrumb />
      
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Mail className="w-16 h-16 mx-auto mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Contact AeroVerse
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              We'd love to hear from you
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Send us a Message</CardTitle>
                  <CardDescription className="text-gray-300">
                    Fill out the form below and we'll get back to you as soon as possible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="bg-slate-900/50 border-cyan-400/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="bg-slate-900/50 border-cyan-400/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-white">Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                        className="bg-slate-900/50 border-cyan-400/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-white">Message</Label>
                      <Textarea
                        id="message"
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        className="bg-slate-900/50 border-cyan-400/20 text-white"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300" size="lg">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info & Social */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Contact Information */}
              <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Contact Information</CardTitle>
                  <CardDescription className="text-gray-300">
                    Reach out through any of these channels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-white">{item.label}</p>
                        <p className="text-gray-300">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Social Media */}
              <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Follow Us</CardTitle>
                  <CardDescription className="text-gray-300">
                    Join our community on social media
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {socialLinks.map((social) => (
                      <motion.a
                        key={social.label}
                        href={social.href}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-3 p-4 rounded-lg bg-slate-900/50 hover:bg-cyan-400/10 border border-cyan-400/20 hover:border-cyan-400/40 transition-all ${social.color}`}
                      >
                        <social.icon className="w-6 h-6" />
                        <span className="font-medium text-white">{social.label}</span>
                      </motion.a>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Office Hours */}
              <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Support Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Monday - Friday</span>
                    <span className="font-semibold text-white">9:00 AM - 6:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Weekend</span>
                    <span className="font-semibold text-white">Closed</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-4">
                    We typically respond within 24 hours during business days
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map/Illustration Section */}
      <section className="py-20 bg-slate-900/30 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
              Global Community, Local Impact
            </h2>
            <div className="relative h-96 bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl flex items-center justify-center overflow-hidden">
              <div className="relative z-10 text-center">
                <MapPin className="w-24 h-24 mx-auto mb-4 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                <p className="text-xl text-gray-300 max-w-md mx-auto">
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
