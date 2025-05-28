import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Environment variables needed by client-side code should be explicitly listed here
  // if not prefixed with NEXT_PUBLIC_. However, since we use NEXT_PUBLIC_ prefix,
  // they are automatically available. This section is for documentation or if non-prefixed vars were used by server.
  // env: {
  //   CLOCKIFY_API_KEY: process.env.CLOCKIFY_API_KEY,
  //   CLOCKIFY_API_URL: process.env.CLOCKIFY_API_URL,
  // },
};

export default nextConfig;
