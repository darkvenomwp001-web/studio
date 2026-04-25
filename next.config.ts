import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* Dynamic deployment config optimized for Vercel */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'httpsí',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // Fix for @opentelemetry/exporter-jaeger error on Vercel/Genkit
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/exporter-jaeger': false,
      '@opentelemetry/otlp-grpc-exporter-base': false,
      '@opentelemetry/otlp-proto-exporter-base': false,
      '@opentelemetry/otlp-transformer': false,
    };
    return config;
  },
};

export default nextConfig;
