import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schema
const FilterSchema = z.enum(['all', 'spaceflight', 'nasa', 'esa']).optional().default('all');

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  image_url?: string;
  source: string;
  published: string;
}

// Authenticate user from JWT
async function authenticateUser(req: Request): Promise<{ user: { id: string } } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const jwt = authHeader.replace('Bearer ', '');
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser(jwt);
  if (error || !user) return null;

  return { user: { id: user.id } };
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
    // Authenticate user
    const auth = await authenticateUser(req);
    if (!auth) {
      console.log('Unauthorized access attempt to news');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', auth.user.id);

    const url = new URL(req.url);
    const filterParam = url.searchParams.get('filter') || 'all';

    // Validate filter parameter
    const validationResult = FilterSchema.safeParse(filterParam);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid filter parameter. Must be one of: all, spaceflight, nasa, esa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filter = validationResult.data;
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
