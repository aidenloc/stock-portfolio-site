import type { MetadataRoute } from 'next'

const SITE_URL = 'https://stock-portfolio-site.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: SITE_URL, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/experience`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/projects`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
