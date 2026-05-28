/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [],
  },
  async redirects() {
    return [
      {
        source: '/settings',
        destination: '/profile',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
