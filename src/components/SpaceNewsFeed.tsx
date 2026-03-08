import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

// 🌍 Step 1: Add all agencies you want to fetch from
const AGENCY_FEEDS = [
  { name: "NASA", url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.nasa.gov/rss/dyn/breaking_news.rss" },
  { name: "ESA", url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.esa.int/rssfeed/Our_Activities" },
  { name: "ISRO", url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.isro.gov.in/rss.xml" },
  { name: "Roscosmos", url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.roscosmos.ru/rss/" },
  { name: "JAXA", url: "https://api.rss2json.com/v1/api.json?rss_url=https://global.jaxa.jp/rss/rss.xml" },
  { name: "SpaceNews", url: "https://api.rss2json.com/v1/api.json?rss_url=https://spacenews.com/feed/" },
];

export default function SpaceNewsFeed() {
  // Step 2: Fetch news using React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["space-news"],
    queryFn: async () => {
      const allFeeds = await Promise.all(
        AGENCY_FEEDS.map(async (feed) => {
          const res = await fetch(feed.url);
          const json = await res.json();
          return json.items.map((item: { title?: string; link?: string; pubDate?: string }) => ({
            agency: feed.name,
            title: item.title || '',
            link: item.link || '',
            date: item.pubDate || '',
          }));
        })
      );
      // Step 3: Combine and sort all news by date
      return allFeeds.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    refetchInterval: 6 * 60 * 60 * 1000, // refresh every 6 hours
  });

  if (isLoading) return <p className="text-center text-gray-400">Fetching latest space news...</p>;
  if (error) return <p className="text-red-500 text-center">Error loading space news.</p>;

  // Step 4: Display all news in animated cards
  return (
    <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.slice(0, 15).map((news, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="bg-card border-border hover:border-primary transition">
            <CardContent className="p-4">
              <p className="text-xs text-primary mb-2">{news.agency}</p>
              <a
                href={news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-semibold hover:underline"
              >
                {news.title}
              </a>
              <p className="text-gray-400 text-xs mt-2">{new Date(news.date).toLocaleString()}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
