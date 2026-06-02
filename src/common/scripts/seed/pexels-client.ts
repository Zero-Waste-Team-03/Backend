/**
 * @fileoverview Lightweight Pexels API client for the demo seeder.
 *
 * Only the endpoints we need — curated/portrait photos for avatars and
 * food photos for donation images. Results are memoised in-process so
 * we never hit the same query twice in one seed run.
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY ?? '';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
}

const cache = new Map<string, PexelsPhoto[]>();

async function fetchPexels(
  query: string,
  perPage: number,
  orientation?: string,
): Promise<PexelsPhoto[]> {
  const cacheKey = `${query}:${perPage}:${orientation ?? ''}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  if (!PEXELS_API_KEY) {
    process.stderr.write(
      '[pexels-client] PEXELS_API_KEY is not set. Falling back to placeholder URLs.\n',
    );
    return [];
  }

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    locale: 'en-US',
  });
  if (orientation) {
    params.set('orientation', orientation);
  }

  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: PEXELS_API_KEY },
  });

  if (!res.ok) {
    const body = await res.text();
    process.stderr.write(
      `[pexels-client] Pexels API error ${res.status}: ${body}\n`,
    );
    return [];
  }

  const data = (await res.json()) as PexelsSearchResponse;
  const photos = data.photos ?? [];
  cache.set(cacheKey, photos);
  return photos;
}

export interface PexelsImageResult {
  id: number;
  url: string;
  alt: string;
  photographer: string;
  width: number;
  height: number;
}

function toResult(photo: PexelsPhoto): PexelsImageResult {
  return {
    id: photo.id,
    url: photo.src.large,
    alt: photo.alt ?? '',
    photographer: photo.photographer,
    width: photo.width,
    height: photo.height,
  };
}

export async function searchPortraits(
  count: number,
): Promise<PexelsImageResult[]> {
  const queries = ['portrait person', 'headshot', 'face smile', 'people'];
  const results: PexelsImageResult[] = [];

  for (const q of queries) {
    if (results.length >= count) break;
    const photos = await fetchPexels(q, Math.min(count - results.length, 80), 'portrait');
    results.push(...photos.map(toResult));
  }

  return results.slice(0, count);
}

export async function searchFood(
  count: number,
): Promise<PexelsImageResult[]> {
  const queries = [
    'food donation',
    'fresh bread bakery',
    'fruits vegetables market',
    'cooked meal plate',
    'dairy products',
    'dry goods grains',
    'beverages juice',
  ];
  const results: PexelsImageResult[] = [];

  for (const q of queries) {
    if (results.length >= count) break;
    const photos = await fetchPexels(q, Math.min(count - results.length, 80), 'landscape');
    results.push(...photos.map(toResult));
  }

  return results.slice(0, count);
}

export async function searchBadgeIcons(
  count: number,
): Promise<PexelsImageResult[]> {
  const queries = ['medal badge icon', 'award trophy', 'achievement star'];
  const results: PexelsImageResult[] = [];

  for (const q of queries) {
    if (results.length >= count) break;
    const photos = await fetchPexels(q, Math.min(count - results.length, 80), 'square');
    results.push(...photos.map(toResult));
  }

  return results.slice(0, count);
}