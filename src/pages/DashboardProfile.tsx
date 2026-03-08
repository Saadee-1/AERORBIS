import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Lock, Palette, LogOut, Upload, Shield, Wifi } from "lucide-react";
import { motion } from "framer-motion";

const HudCorners = () => (
  <>
    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/60" />
    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/60" />
    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/60" />
  </>
);

const HudPanel = ({ children, className = "", label }: { children: React.ReactNode; className?: string; label?: string }) => (
  <div className={`relative bg-card/40 backdrop-blur-lg border border-primary/20 rounded-lg overflow-hidden ${className}`}>
    <HudCorners />
    {label && (
      <div className="absolute top-2 right-3 text-[10px] font-rajdhani tracking-widest text-primary/40 uppercase">{label}</div>
    )}
    {children}
  </div>
);

const userProfile = {
  name: "Saad Ahmed",
  email: "saad@aeroverse.com",
  university: "MIT",
  bio: "Passionate aerospace engineering student focused on hypersonic flight and advanced propulsion systems.",
  interests: ["Aerodynamics", "Space Systems", "Propulsion"],
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Saad",
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const DashboardProfile = () => {
  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[10px] font-rajdhani tracking-[0.3em] text-primary/50 mb-2">// OPERATOR PROFILE</p>
        <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-primary mb-2">Profile & Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account configuration and system preferences</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-1"
        >
          <HudPanel label="ID Card">
            <CardHeader>
              <CardTitle className="text-foreground font-orbitron text-lg">Operator Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <motion.div className="relative group" whileHover={{ scale: 1.05 }}>
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/40 to-primary/10 blur-sm" />
                  <Avatar className="w-28 h-28 relative border-2 border-primary/30">
                    <AvatarImage src={userProfile.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl font-orbitron">SA</AvatarFallback>
                  </Avatar>
                </div>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </motion.div>

              <h2 className="text-xl font-orbitron font-bold text-foreground mt-4">{userProfile.name}</h2>
              <p className="text-muted-foreground text-sm">{userProfile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-xs font-rajdhani tracking-wider text-primary">CLEARANCE: L3</span>
              </div>

              <div className="w-full mt-6 space-y-3">
                {[
                  { label: "Member Since", value: "January 2024" },
                  { label: "Institution", value: userProfile.university },
                  { label: "Rank", value: "#47 (Top 5%)", highlight: true },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    custom={i}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-muted/30 border border-primary/10 p-3 rounded-lg"
                    whileHover={{ scale: 1.02, borderColor: "hsl(var(--primary) / 0.3)" }}
                  >
                    <p className="text-[10px] font-rajdhani tracking-widest text-muted-foreground uppercase">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.highlight ? 'text-primary' : 'text-foreground'}`}>{item.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Status indicators */}
              <div className="w-full mt-4 flex items-center justify-between text-[10px] font-rajdhani tracking-wider text-muted-foreground border-t border-primary/10 pt-3">
                <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-green-400" /> ONLINE</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-primary" /> VERIFIED</span>
              </div>

              <motion.div className="w-full mt-4" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </motion.div>
            </CardContent>
          </HudPanel>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="bg-card/40 backdrop-blur-lg border border-primary/20 w-full justify-start">
              {[
                { value: "account", icon: User, label: "Account" },
                { value: "notifications", icon: Bell, label: "Alerts" },
                { value: "security", icon: Lock, label: "Security" },
                { value: "preferences", icon: Palette, label: "Display" },
              ].map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2 font-rajdhani tracking-wider text-xs data-[state=active]:text-primary data-[state=active]:shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <HudPanel label="// Account Config">
                  <CardHeader>
                    <CardTitle className="text-foreground font-orbitron text-lg">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: "name", label: "Full Name", value: userProfile.name },
                        { id: "university", label: "Institution", value: userProfile.university },
                      ].map((field, i) => (
                        <motion.div key={field.id} custom={i} variants={itemVariants} initial="hidden" animate="visible">
                          <Label htmlFor={field.id} className="text-foreground text-xs font-rajdhani tracking-wider uppercase">{field.label}</Label>
                          <Input id={field.id} defaultValue={field.value} className="bg-muted/30 border-primary/20 focus:border-primary/50 focus:shadow-[0_0_10px_hsl(var(--primary)/0.1)]" />
                        </motion.div>
                      ))}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-foreground text-xs font-rajdhani tracking-wider uppercase">Email Address</Label>
                      <Input id="email" type="email" defaultValue={userProfile.email} className="bg-muted/30 border-primary/20 focus:border-primary/50" />
                    </div>
                    <div>
                      <Label htmlFor="bio" className="text-foreground text-xs font-rajdhani tracking-wider uppercase">Bio</Label>
                      <Textarea id="bio" defaultValue={userProfile.bio} className="bg-muted/30 border-primary/20 focus:border-primary/50 min-h-24" />
                    </div>
                    <div>
                      <Label htmlFor="interests" className="text-foreground text-xs font-rajdhani tracking-wider uppercase">Interests</Label>
                      <Input id="interests" defaultValue={userProfile.interests.join(", ")} className="bg-muted/30 border-primary/20 focus:border-primary/50" />
                    </div>
                    <Button className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                      Save Changes
                    </Button>
                  </CardContent>
                </HudPanel>
              </motion.div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <HudPanel label="// Alert Config">
                  <CardHeader>
                    <CardTitle className="text-foreground font-orbitron text-lg">Alert Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {[
                      { title: "Course Updates", desc: "New modules and content alerts", defaultChecked: true },
                      { title: "Research Updates", desc: "Research submission notifications", defaultChecked: true },
                      { title: "Community Activity", desc: "Community discussion updates", defaultChecked: false },
                      { title: "Weekly Digest", desc: "Weekly activity summary report", defaultChecked: true },
                    ].map((item, i) => (
                      <motion.div
                        key={item.title}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center justify-between p-3 rounded-lg border border-primary/10 bg-muted/20 hover:border-primary/25 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} />
                      </motion.div>
                    ))}
                  </CardContent>
                </HudPanel>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <HudPanel label="// Security Protocol">
                  <CardHeader>
                    <CardTitle className="text-foreground font-orbitron text-lg">Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { id: "current-password", label: "Current Password" },
                      { id: "new-password", label: "New Password" },
                      { id: "confirm-password", label: "Confirm New Password" },
                    ].map((field, i) => (
                      <motion.div key={field.id} custom={i} variants={itemVariants} initial="hidden" animate="visible">
                        <Label htmlFor={field.id} className="text-foreground text-xs font-rajdhani tracking-wider uppercase">{field.label}</Label>
                        <Input id={field.id} type="password" className="bg-muted/30 border-primary/20 focus:border-primary/50" />
                      </motion.div>
                    ))}
                    <Button className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                      Update Password
                    </Button>
                  </CardContent>
                </HudPanel>
              </motion.div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <HudPanel label="// Display Config">
                  <CardHeader>
                    <CardTitle className="text-foreground font-orbitron text-lg">Display Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {[
                      { title: "Dark Mode", desc: "Command center theme active", defaultChecked: true, disabled: true },
                      { title: "Animations", desc: "Enable HUD transitions and effects", defaultChecked: true, disabled: false },
                      { title: "Daily Challenge", desc: "Display daily aerospace quiz on dashboard", defaultChecked: true, disabled: false },
                    ].map((item, i) => (
                      <motion.div
                        key={item.title}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center justify-between p-3 rounded-lg border border-primary/10 bg-muted/20 hover:border-primary/25 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} disabled={item.disabled} />
                      </motion.div>
                    ))}
                  </CardContent>
                </HudPanel>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
