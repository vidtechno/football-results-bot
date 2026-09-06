/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.manbora.uz' }],
        destination: 'https://manbora.uz/:path*',
        permanent: true,
      },
      {
        source: '/kitoblar',
        destination: '/asarlar?type=book',
        permanent: true,
      },
      {
        source: '/hikoyalar',
        destination: '/asarlar?type=serialized_story',
        permanent: true,
      },
      {
        source: '/royxatdan-otish',
        destination: '/kirish?mode=register',
        permanent: true,
      },
      {
        source: '/admin',
        destination: '/diyoration/dashboard',
        permanent: true,
      },
      {
        source: '/admin/:path*',
        destination: '/diyoration/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
