import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NEWS_API_BASE = 'https://newsdata.io/api/1/latest';
const DEFAULT_COUNTRY = 'us';
const DEFAULT_LIMIT = 12;
const ALLOWED_NEWS_QUERIES = [
  'wildfires',
  'earthquake',
  'hurricane',
  'tornado',
  'landslide',
  'tsunami',
  'heatwave',
];

type NewsDataItem = {
  article_id?: string;
  title?: string;
  description?: string | null;
  link?: string;
  image_url?: string | null;
  pubDate?: string;
  source_name?: string;
  source_url?: string;
  category?: string[];
  country?: string[];
  q?: string;
};

async function fetchOneQuery(
  apiKey: string,
  country: string,
  query: string
): Promise<{ query: string; results: NewsDataItem[]; error?: string }> {
  const params = new URLSearchParams({
    apikey: apiKey,
    country,
    q: query,
  });
  const url = `${NEWS_API_BASE}?${params.toString()}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { query, results: [], error: `Request failed with status ${res.status}` };
    }
    const data = await res.json();
    const rows = Array.isArray(data?.results) ? (data.results as NewsDataItem[]) : [];
    const normalized = rows.map((item) => ({ ...item, q: query }));
    return { query, results: normalized };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown fetch error';
    return { query, results: [], error: message };
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEWS_MEDIA_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'NEWS_MEDIA_KEY is not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.trim() || DEFAULT_COUNTRY;
  const limit = Math.max(1, Math.min(20, Number(searchParams.get('limit') || DEFAULT_LIMIT)));
  const requestedQuery = (searchParams.get('q') || 'wildfires').trim().toLowerCase();

  if (!ALLOWED_NEWS_QUERIES.includes(requestedQuery)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unsupported query',
        data: { allowedQueries: ALLOWED_NEWS_QUERIES },
      },
      { status: 400 }
    );
  }

  const response = await fetchOneQuery(apiKey, country, requestedQuery);

  const byQuery = [
    {
      query: response.query,
      error: response.error,
      total: response.results.length,
      results: response.results.slice(0, limit),
    },
  ];

  const seen = new Set<string>();
  const merged = byQuery
    .flatMap((entry) => entry.results)
    .filter((item) => {
      const key = item.article_id || item.link || `${item.title || ''}-${item.pubDate || ''}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return NextResponse.json({
    success: true,
    data: {
      country,
      selectedQuery: requestedQuery,
      queries: ALLOWED_NEWS_QUERIES,
      total: merged.length,
      articles: merged,
      byQuery,
      fetchedAt: new Date().toISOString(),
    },
  });
}
