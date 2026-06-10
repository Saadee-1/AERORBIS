import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Microscope, Rocket, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import PageBreadcrumb from "@/components/PageBreadcrumb";

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  image_url?: string;
  source: string;
  published: string;
}

const Research = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [filter, setFilter] = useState<string>("all");

  // Fetch news directly from client-side APIs
  const { data, isLoading, error } = useQuery({
    queryKey: ["aerospace-news", filter],
    queryFn: async () => {
      let spaceflightNews: NewsArticle[] = [];
      let nasaNews: NewsArticle[] = [];
      let esaNews: NewsArticle[] = [];

      try {
        if (filter === "all" || filter === "spaceflight") {
          const res = await fetch("https://api.spaceflightnewsapi.net/v4/articles/?limit=6");
          if (res.ok) {
            const data = await res.json();
            spaceflightNews = (data.results || []).map((a: any) => ({
              title: a.title || "",
              summary: a.summary || "",
              url: a.url || "",
              image_url: a.image_url || "",
              source: "Spaceflight News",
              published: a.published_at || new Date().toISOString(),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch Spaceflight News:", err);
      }

      try {
        if (filter === "all" || filter === "nasa") {
          const res = await fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.nasa.gov/rss/dyn/breaking_news.rss");
          if (res.ok) {
            const data = await res.json();
            nasaNews = (data.items || []).slice(0, 6).map((item: any) => ({
              title: item.title || "",
              summary: item.description?.replace(/<[^>]*>/g, "").substring(0, 200) + "...",
              url: item.link || "",
              image_url: item.enclosure?.link || item.thumbnail || "",
              source: "NASA",
              published: item.pubDate || new Date().toISOString(),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch NASA news:", err);
      }

      try {
        if (filter === "all" || filter === "esa") {
          const res = await fetch("https://api.rss2json.com/v1/api.json?rss_url=https://www.esa.int/rssfeed/Our_Activities/Space_News");
          if (res.ok) {
            const data = await res.json();
            esaNews = (data.items || []).slice(0, 6).map((item: any) => ({
              title: item.title || "",
              summary: item.description?.replace(/<[^>]*>/g, "").substring(0, 200) + "...",
              url: item.link || "",
              image_url: item.enclosure?.link || item.thumbnail || "",
              source: "ESA",
              published: item.pubDate || new Date().toISOString(),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch ESA news:", err);
      }

      const allNews = [...spaceflightNews, ...nasaNews, ...esaNews];
      allNews.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
      return allNews.slice(0, 18) as NewsArticle[];
    },
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  });

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <PageBreadcrumb />
      
      {/* Hero Section */}
      <section className="pt-24 pb-8 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="inline-block mb-4"
            >
              <Microscope className="w-12 h-12 text-primary drop-shadow-[0_0_20px_hsl(160_84%_39%/0.8)]" />
            </motion.div>
            
            <h1 className="text-[26px] md:text-[32px] lg:text-[44px] leading-tight font-bold mb-4 font-[Orbitron] uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
              Aerospace Research & Innovation Hub
            </h1>
            
            <p className="text-base text-muted-foreground mb-4 leading-relaxed max-w-2xl mx-auto">
              Explore the latest breakthroughs in aerospace engineering, space exploration, and cutting-edge research.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter and News Section */}
      <section className="py-16 relative" ref={ref}>
        <div className="container mx-auto px-4">
          {/* Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-12"
          >
            <div className="flex items-center gap-4 bg-card/50 backdrop-blur-lg border border-primary/20 rounded-2xl p-4 shadow-[0_0_30px_hsl(160_84%_39%/0.2)]">
              <Filter className="w-5 h-5 text-primary" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[200px] bg-transparent border-primary/30 text-foreground">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-primary/30">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="nasa">NASA</SelectItem>
                  <SelectItem value="esa">ESA</SelectItem>
                  <SelectItem value="spaceflight">Spaceflight News</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-card/50 backdrop-blur-lg border-primary/20">
                  <CardContent className="p-0">
                    <Skeleton className="w-full h-48 rounded-t-lg" />
                    <div className="p-6 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 text-lg">Failed to load news. Please try again later.</p>
            </div>
          )}

          {/* News Grid */}
          {data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {data.map((article, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                >
                  <Card className="h-full bg-card/50 backdrop-blur-lg border-primary/20 rounded-2xl overflow-hidden hover:border-primary/60 hover:shadow-[0_0_40px_hsl(160_84%_39%/0.3)] transition-all duration-300">
                    <CardContent className="p-0">
                      {article.image_url && (
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={article.image_url} 
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                        </div>
                      )}
                      
                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-primary" />
                          <span className="text-xs text-primary font-semibold uppercase tracking-wider">
                            {article.source}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight">
                          {article.title}
                        </h3>
                        
                        <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                          {article.summary}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4">
                          <span className="text-xs text-gray-400">
                            {new Date(article.published).toLocaleDateString()}
                          </span>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors duration-200"
                          >
                            Read full article →
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Submit Research Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Submit Your Research
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Have groundbreaking research to share? Join our community of innovators and contribute to the future of aerospace engineering.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-[0_0_30px_hsl(160_84%_39%/0.4)] hover:shadow-[0_0_50px_hsl(160_84%_39%/0.6)] transition-all duration-300"
              onClick={() => { import("sonner").then(m => m.toast.info("🚀 Coming Soon — Research submission portal is under development!")); }}
            >
              Submit Research Paper
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Research;
