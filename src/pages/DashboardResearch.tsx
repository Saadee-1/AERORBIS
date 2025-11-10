import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Calendar, Eye, Edit } from "lucide-react";
import { motion } from "framer-motion";

const DashboardResearch = () => {
  // Mock data - Future Integration: Connect to Database
  const research = [
    {
      id: 1,
      title: "Optimization of Wing Design for Hypersonic Flight",
      category: "Aerodynamics",
      status: "Featured",
      uploadDate: "2024-01-15",
      abstract: "This research explores novel approaches to wing geometry optimization for sustained hypersonic flight conditions...",
    },
    {
      id: 2,
      title: "Advanced Ion Propulsion Systems",
      category: "Propulsion",
      status: "Approved",
      uploadDate: "2024-01-20",
      abstract: "An in-depth analysis of ion propulsion efficiency improvements through magnetic field manipulation...",
    },
    {
      id: 3,
      title: "Composite Materials for Spacecraft Structures",
      category: "Structures",
      status: "Pending",
      uploadDate: "2024-01-25",
      abstract: "Investigation of carbon-fiber reinforced polymers under extreme temperature variations in space environments...",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Featured":
        return "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30";
      case "Approved":
        return "bg-blue-400/20 text-blue-400 border border-blue-400/30";
      case "Pending":
        return "bg-slate-700/50 text-gray-400 border border-slate-600/30";
      default:
        return "bg-slate-700/50 text-gray-400 border border-slate-600/30";
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">My Research</h1>
          <p className="text-gray-400">Manage and submit your aerospace research</p>
        </div>

        {/* Upload Research Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">
              <Plus className="w-4 h-4 mr-2" />
              Upload New Research
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900/95 backdrop-blur-lg border-cyan-400/30 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Submit New Research</DialogTitle>
            </DialogHeader>
            {/* Future Integration: Connect to Database */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-gray-300">Research Title</Label>
                <Input id="title" placeholder="Enter research title" className="bg-slate-800/50 border-cyan-400/20 text-white" />
              </div>
              <div>
                <Label htmlFor="category" className="text-gray-300">Category</Label>
                <Select>
                  <SelectTrigger className="bg-slate-800/50 border-cyan-400/20 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900/95 backdrop-blur-lg border-cyan-400/30">
                    <SelectItem value="aerodynamics">Aerodynamics</SelectItem>
                    <SelectItem value="propulsion">Propulsion</SelectItem>
                    <SelectItem value="structures">Structures</SelectItem>
                    <SelectItem value="avionics">Avionics</SelectItem>
                    <SelectItem value="space">Space Systems</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="abstract" className="text-gray-300">Abstract / Summary</Label>
                <Textarea
                  id="abstract"
                  placeholder="Provide a brief summary of your research..."
                  className="bg-slate-800/50 border-cyan-400/20 text-white min-h-32"
                />
              </div>
              <div>
                <Label htmlFor="file" className="text-gray-300">Upload PDF</Label>
                <Input id="file" type="file" accept=".pdf" className="bg-slate-800/50 border-cyan-400/20 text-white" />
              </div>
              <Button className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                Submit Research
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Research List */}
      <div className="space-y-6">
        {research.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:border-cyan-400/60 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className="text-white">{item.title}</CardTitle>
                      <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{item.category}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(item.uploadDate).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">{item.abstract}</p>
                <div className="flex space-x-3">
                  <Button variant="outline" size="sm" className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">5</p>
              <p className="text-gray-400">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-400 mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">1</p>
              <p className="text-gray-400">Featured Research</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-white mb-2">234</p>
              <p className="text-gray-400">Total Views</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardResearch;
