import { createRequire } from 'module'
const _require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix: webpack can't resolve tslib inside Supabase packages in the middleware
  // bundle unless we explicitly alias it to the installed location.
  transpilePackages: [
    '@supabase/supabase-js',
    '@supabase/auth-js',
    '@supabase/ssr',
    '@supabase/functions-js',
    '@supabase/realtime-js',
    '@supabase/storage-js',
    '@supabase/postgrest-js',
  ],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      tslib: _require.resolve('tslib'),
    }
    return config
  },

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
