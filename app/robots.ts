import type { MetadataRoute } from 'next'

const SITE_URL = 'https://stock-portfolio-site.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin pages already send noindex headers, but a crawler shouldn't
      // waste requests discovering them in the first place.
      disallow: ['/admin', '/admin/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
