import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Manbora — mutolaa platformasi', short_name: 'Manbora',
    description: 'O‘zbek tilidagi asarlarni o‘qing va mutolaani davom ettiring.',
    start_url: '/', display: 'standalone', background_color: '#faf8f5', theme_color: '#b45309',
    lang: 'uz', orientation: 'portrait-primary',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
