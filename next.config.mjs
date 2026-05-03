/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

if (isProduction) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  })
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimize package imports to reduce bundle size and improve LCP
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      '@tanstack/react-query',
    ],
  },

  // Enable compression for faster page loads
  compress: true,

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: isProduction ? { exclude: ['error', 'warn'] } : false,
  },

  // Image optimization settings
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // HTTP headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
