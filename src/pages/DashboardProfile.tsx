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
import { motion } from "framer-motion";

const DashboardProfile = () => {
  // Mock data - Future Integration: Connect to Database
  const userProfile = {
    name: "Saad Ahmed",
    email: "saad@aeroverse.com",
    university: "MIT",
    bio: "Passionate aerospace engineering student focused on hypersonic flight and advanced propulsion systems.",
    interests: ["Aerodynamics", "Space Systems", "Propulsion"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Saad",
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">Profile & Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative group">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={userProfile.avatar} />
                  <AvatarFallback className="bg-cyan-400 text-black text-3xl">
                    SA
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-2xl font-bold text-white mt-4">{userProfile.name}</h2>
              <p className="text-gray-400">{userProfile.email}</p>
              <p className="text-sm text-cyan-400 mt-2">{userProfile.university}</p>

              <div className="w-full mt-6 space-y-3">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                  <p className="text-sm font-semibold text-foreground">January 2024</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Rank</p>
                  <p className="text-sm font-semibold text-primary">#47 (Top 5%)</p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-6 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
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
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Future Integration: Connect to Database */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-foreground">Full Name</Label>
                      <Input id="name" defaultValue={userProfile.name} className="bg-muted border-border" />
                    </div>
                    <div>
                      <Label htmlFor="university" className="text-foreground">University / Organization</Label>
                      <Input id="university" defaultValue={userProfile.university} className="bg-muted border-border" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-foreground">Email Address</Label>
                    <Input id="email" type="email" defaultValue={userProfile.email} className="bg-muted border-border" />
                  </div>
                  <div>
                    <Label htmlFor="bio" className="text-foreground">Bio</Label>
                    <Textarea
                      id="bio"
                      defaultValue={userProfile.bio}
                      className="bg-muted border-border min-h-24"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interests" className="text-foreground">Interests (comma separated)</Label>
                    <Input
                      id="interests"
                      defaultValue={userProfile.interests.join(", ")}
                      className="bg-muted border-border"
                    />
                  </div>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Course Updates</p>
                      <p className="text-sm text-muted-foreground">Get notified about new modules and content</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Research Updates</p>
                      <p className="text-sm text-muted-foreground">Notifications about your research submissions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Community Activity</p>
                      <p className="text-sm text-muted-foreground">Updates from community discussions</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Weekly Digest</p>
                      <p className="text-sm text-muted-foreground">Receive a weekly summary of your activity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="current-password" className="text-foreground">Current Password</Label>
                    <Input id="current-password" type="password" className="bg-muted border-border" />
                  </div>
                  <div>
                    <Label htmlFor="new-password" className="text-foreground">New Password</Label>
                    <Input id="new-password" type="password" className="bg-muted border-border" />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password" className="text-foreground">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" className="bg-muted border-border" />
                  </div>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Display Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">Currently using dark theme</p>
                    </div>
                    <Switch defaultChecked disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Animations</p>
                      <p className="text-sm text-muted-foreground">Enable smooth transitions and effects</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Show Daily Challenge</p>
                      <p className="text-sm text-muted-foreground">Display daily aerospace quiz on dashboard</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
