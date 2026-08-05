// robots.txt asks crawlers not to fetch the private routes; this asks them not
// to index one they reached anyway (a shared link, a referrer, a stale
// sitemap). Both are needed — Disallow alone can still leave a URL-only entry
// in an index, and it is the wrong outcome for a residents' portal.
export const NOINDEX_META = [
  { name: 'robots', content: 'noindex,nofollow' },
] as const

const SITE_NAME = 'StayFlow'
const SITE_URL = 'https://stay-flow-alpha.vercel.app'
const OG_IMAGE = `${SITE_URL}/images/hero/landing.webp`

// Only the public landing page is shared, so one set of tags covers it. Private
// routes deliberately get none: a preview card for a page nobody can open just
// leaks the product surface to whoever the link was forwarded to.
export function publicPageMeta(title: string, description: string) {
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: SITE_URL },
    { property: 'og:image', content: OG_IMAGE },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: OG_IMAGE },
  ]
}

export const CANONICAL_LINK = { rel: 'canonical', href: SITE_URL }
