export type SeoEntry = {
  title: string
  description: string
  path: string
}

export const SEO_ENTRIES: Record<string, SeoEntry> = {
  '/': {
    title: 'Atlanta Photographer & Wedding Photography | FLIX 4K',
    description: 'FLIX 4K is an Atlanta photographer for weddings, portraits, events, video, and film productions across metro Atlanta. Book a professional photo and video crew.',
    path: '/',
  },
  '/about': {
    title: 'About FLIX 4K | Atlanta Photography & Video Crew',
    description: 'Learn about FLIX 4K Photography, an inclusive Atlanta photo and video crew serving weddings, portraits, events, and film productions across metro Atlanta.',
    path: '/about',
  },
  '/portfolio': {
    title: 'Atlanta Photography Portfolio | FLIX 4K',
    description: 'Explore the FLIX 4K photography portfolio featuring Atlanta weddings, portraits, birthdays, events, and visual stories created across metro Atlanta.',
    path: '/portfolio',
  },
  '/portfolio/weddings': {
    title: 'Atlanta Wedding Photographer | FLIX 4K',
    description: 'View Atlanta wedding photography by FLIX 4K, with thoughtful coverage for ceremonies, celebrations, couples, families, and the moments between them.',
    path: '/portfolio/weddings',
  },
  '/portfolio/events': {
    title: 'Atlanta Event Photographer | FLIX 4K',
    description: 'See event photography from FLIX 4K for Atlanta celebrations, special events, productions, and gatherings captured with an efficient professional crew.',
    path: '/portfolio/events',
  },
  '/portfolio/birthdays': {
    title: 'Atlanta Birthday Event Photography | FLIX 4K',
    description: 'Explore birthday and milestone event photography from FLIX 4K, serving clients across metro Atlanta with polished, friendly, efficient coverage.',
    path: '/portfolio/birthdays',
  },
  '/portfolio/portraits': {
    title: 'Atlanta Portrait Photographer | FLIX 4K',
    description: 'Discover Atlanta portrait photography by FLIX 4K for individuals, couples, families, and personal stories captured with intention.',
    path: '/portfolio/portraits',
  },
  '/videos': {
    title: 'Atlanta Photography & Video Reels | FLIX 4K',
    description: 'Watch FLIX 4K photography and video reels for weddings, events, portraits, social content, and film-friendly productions across metro Atlanta.',
    path: '/videos',
  },
  '/book': {
    title: 'Book an Atlanta Photographer | FLIX 4K',
    description: 'Book FLIX 4K for Atlanta wedding photography, portraits, events, video, or film production. Tell us what you are planning and start a conversation.',
    path: '/book',
  },
}
