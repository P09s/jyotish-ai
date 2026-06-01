import { MetadataRoute } from 'next'

const BASE_URL = 'https://daivam.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/signup', '/login'],
        disallow: [
          '/dashboard',
          '/kundali',
          '/chat',
          '/profile',
          '/panchang',
          '/transits',
          '/milan',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}