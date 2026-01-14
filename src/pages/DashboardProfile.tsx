import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Lock, Palette, LogOut, Upload } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const DashboardProfile = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const headerInView = useInView(headerRef, { once: true, margin: "-50px" as `${number}px` });
  const profileInView = useInView(profileRef, { once: true, margin: "-50px" as `${number}px` });
  const settingsInView = useInView(settingsRef, { once: true, margin: "-50px" as `${number}px` });

  const userProfile = {
    name: "Saad Ahmed",
    email: "saad@aeroverse.com",
    university: "MIT",
    bio: "Passionate aerospace engineering student focused on hypersonic flight and advanced propulsion systems.",
    interests: ["Aerodynamics", "Space Systems", "Propulsion"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Saad",
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div 
        ref={headerRef}
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">Profile & Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          ref={profileRef}
          initial={{ opacity: 0, x: -40 }}
          animate={profileInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-1"
        >
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <motion.div 
                className="relative group"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <Avatar className="w-32 h-32">
                  <AvatarImage src={userProfile.avatar} />
                  <AvatarFallback className="bg-cyan-400 text-black text-3xl">
                    SA
                  </AvatarFallback>
                </Avatar>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="sm"
                    className="absolute bottom-0 right-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </motion.div>
              </motion.div>
              <motion.h2 
                className="text-2xl font-bold text-white mt-4"
                initial={{ opacity: 0 }}
                animate={profileInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                {userProfile.name}
              </motion.h2>
              <motion.p 
                className="text-gray-400"
                initial={{ opacity: 0 }}
                animate={profileInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.4 }}
              >
                {userProfile.email}
              </motion.p>
              <motion.p 
                className="text-sm text-cyan-400 mt-2"
                initial={{ opacity: 0 }}
                animate={profileInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.5 }}
              >
                {userProfile.university}
              </motion.p>

              <motion.div 
                className="w-full mt-6 space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate={profileInView ? "visible" : "hidden"}
              >
                <motion.div variants={itemVariants} className="bg-muted p-4 rounded-lg" whileHover={{ scale: 1.02 }}>
                  <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                  <p className="text-sm font-semibold text-foreground">January 2024</p>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-muted p-4 rounded-lg" whileHover={{ scale: 1.02 }}>
                  <p className="text-xs text-muted-foreground mb-1">Rank</p>
                  <p className="text-sm font-semibold text-primary">#47 (Top 5%)</p>
                </motion.div>
              </motion.div>

              <motion.div 
                className="w-full mt-6"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          ref={settingsRef}
          initial={{ opacity: 0, x: 40 }}
          animate={settingsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2"
        >
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="bg-muted w-full justify-start">
              <TabsTrigger value="account" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Account</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Security</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center space-x-2">
                <Palette className="w-4 h-4" />
                <span>Preferences</span>
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div variants={itemVariants}>
                        <Label htmlFor="name" className="text-foreground">Full Name</Label>
                        <Input id="name" defaultValue={userProfile.name} className="bg-muted border-border" />
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <Label htmlFor="university" className="text-foreground">University / Organization</Label>
                        <Input id="university" defaultValue={userProfile.university} className="bg-muted border-border" />
                      </motion.div>
                    </motion.div>
                    <motion.div variants={itemVariants} initial="hidden" animate="visible">
                      <Label htmlFor="email" className="text-foreground">Email Address</Label>
                      <Input id="email" type="email" defaultValue={userProfile.email} className="bg-muted border-border" />
                    </motion.div>
                    <motion.div variants={itemVariants} initial="hidden" animate="visible">
                      <Label htmlFor="bio" className="text-foreground">Bio</Label>
                      <Textarea
                        id="bio"
                        defaultValue={userProfile.bio}
                        className="bg-muted border-border min-h-24"
                      />
                    </motion.div>
                    <motion.div variants={itemVariants} initial="hidden" animate="visible">
                      <Label htmlFor="interests" className="text-foreground">Interests (comma separated)</Label>
                      <Input
                        id="interests"
                        defaultValue={userProfile.interests.join(", ")}
                        className="bg-muted border-border"
                      />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Save Changes
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { title: "Course Updates", desc: "Get notified about new modules and content", defaultChecked: true },
                      { title: "Research Updates", desc: "Notifications about your research submissions", defaultChecked: true },
                      { title: "Community Activity", desc: "Updates from community discussions", defaultChecked: false },
                      { title: "Weekly Digest", desc: "Receive a weekly summary of your activity", defaultChecked: true },
                    ].map((item, index) => (
                      <motion.div 
                        key={item.title}
                        className="flex items-center justify-between"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileHover={{ x: 5 }}
                      >
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} />
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { id: "current-password", label: "Current Password" },
                      { id: "new-password", label: "New Password" },
                      { id: "confirm-password", label: "Confirm New Password" },
                    ].map((field, index) => (
                      <motion.div 
                        key={field.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                      >
                        <Label htmlFor={field.id} className="text-foreground">{field.label}</Label>
                        <Input id={field.id} type="password" className="bg-muted border-border" />
                      </motion.div>
                    ))}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Update Password
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Display Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { title: "Dark Mode", desc: "Currently using dark theme", defaultChecked: true, disabled: true },
                      { title: "Animations", desc: "Enable smooth transitions and effects", defaultChecked: true, disabled: false },
                      { title: "Show Daily Challenge", desc: "Display daily aerospace quiz on dashboard", defaultChecked: true, disabled: false },
                    ].map((item, index) => (
                      <motion.div 
                        key={item.title}
                        className="flex items-center justify-between"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileHover={{ x: 5 }}
                      >
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} disabled={item.disabled} />
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
