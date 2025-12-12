import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  image_url?: string;
  source: string;
  published: string;
}

async function fetchSpaceflightNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=6');
    const data = await response.json();
    
    return data.results.map((article: unknown) => {
      const a = article as { title: string; summary: string; url: string; image_url: string; published_at: string };
      return {
        title: a.title,
        summary: a.summary,
        url: a.url,
        image_url: a.image_url,
        source: 'Spaceflight News',
        published: a.published_at,
      };
    });
  } catch (error) {
    console.error('Error fetching Spaceflight News:', error);
    return [];
  }
}

async function fetchNASANews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.nasa.gov/rss/dyn/breaking_news.rss');
    const data = await response.json();
    
    return data.items.slice(0, 6).map((item: unknown) => {
      const i = item as { title: string; description?: string; link: string; pubDate: string };
      return {
        title: i.title,
        summary: i.description?.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        url: i.link,
        image_url: (item as { enclosure?: { link?: string }; thumbnail?: string }).enclosure?.link || (item as { thumbnail?: string }).thumbnail,
        source: 'NASA',
        published: i.pubDate,
      };
    });
  } catch (error) {
    console.error('Error fetching NASA news:', error);
    return [];
  }
}

async function fetchESANews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.esa.int/rssfeed/Our_Activities/Space_News');
    const data = await response.json();
    
    return data.items.slice(0, 6).map((item: unknown) => {
      const i = item as { title: string; description?: string; link: string; pubDate: string };
      return {
        title: i.title,
        summary: i.description?.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        url: i.link,
        image_url: (item as { enclosure?: { link?: string }; thumbnail?: string }).enclosure?.link || (item as { thumbnail?: string }).thumbnail,
        source: 'ESA',
        published: i.pubDate,
      };
    });
  } catch (error) {
    console.error('Error fetching ESA news:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter') || 'all';

    let allNews: NewsArticle[] = [];

    // Fetch news based on filter
    if (filter === 'all' || filter === 'spaceflight') {
      const spaceflightNews = await fetchSpaceflightNews();
      allNews = [...allNews, ...spaceflightNews];
    }
    
    if (filter === 'all' || filter === 'nasa') {
      const nasaNews = await fetchNASANews();
      allNews = [...allNews, ...nasaNews];
    }
    
    if (filter === 'all' || filter === 'esa') {
      const esaNews = await fetchESANews();
      allNews = [...allNews, ...esaNews];
    }

    // Sort by published date (newest first)
    allNews.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

    // Limit to 18 articles
    const limitedNews = allNews.slice(0, 18);

    return new Response(
      JSON.stringify({ success: true, articles: limitedNews, count: limitedNews.length }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
