/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

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

module.exports = withPWA(nextConfig)
