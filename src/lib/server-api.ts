/**
 * Utility function to get the correct API URL for server-side fetch calls
 * Works in both development and production environments
 * 
 * Note: Server-side fetch() requires absolute URLs, so we always return a full URL
 * In production, we try to use internal requests when possible
 */
export function getApiUrl(path: string): string {
  // Priority:
  // 1. NEXT_PUBLIC_APP_URL (set in production - should be your domain)
  // 2. VERCEL_URL (automatically set by Vercel)
  // 3. Default to localhost for development
  
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  // If not set, try Vercel's automatic URL
  if (!baseUrl && process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  // Default to localhost for development
  if (!baseUrl) {
    baseUrl = 'http://localhost:3000';
  }
  
  // Ensure baseUrl doesn't end with /
  baseUrl = baseUrl.replace(/\/$/, '');
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Always return absolute URL (required for server-side fetch)
  const fullUrl = `${baseUrl}${normalizedPath}`;
  
  // Log in development to help debug
  if (process.env.NODE_ENV === 'development') {
    console.log(`[getApiUrl] Resolved URL: ${fullUrl}`);
  }
  
  return fullUrl;
}

/**
 * Optimized fetch wrapper with timeout and error handling
 * Uses longer timeout for server-side requests
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    // If it's an abort error, return empty response instead of throwing
    if (error.name === 'AbortError') {
      console.warn(`Request to ${url} timed out after ${timeout}ms`);
      // Return a mock response that indicates failure
      return new Response(JSON.stringify({ success: false, error: 'Request timeout' }), {
        status: 408,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }
}
