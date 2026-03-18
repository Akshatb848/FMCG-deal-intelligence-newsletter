/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // NEXT_PUBLIC_API_URL is set in Vercel env vars pointing to Railway backend.
    // Falls back to localhost for local development.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') // strip trailing slash
      : 'http://localhost:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
};

module.exports = nextConfig;
