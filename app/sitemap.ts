import type { MetadataRoute } from 'next'

const SITE_URL = 'https://stock-portfolio-site.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/portfolio`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/experience`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/projects`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
