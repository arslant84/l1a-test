
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
  allowedDevOrigins: ['https://6000-firebase-studio-1749929670762.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev'],
  webpack: (config, { isServer, webpack }) => {
    // Required for sql.js (and potentially its dependencies) to function in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, 
      path: false, 
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      net: false,
      tls: false,
      os: false,
      assert: false,
      util: false,
      constants: false,
      vm: false,
    };

    // If sql-wasm.wasm is in the /public directory and sql.js is configured to fetch it 
    // (e.g., via locateFile pointing to /sql-wasm.wasm), 
    // an explicit Webpack rule for .wasm files here is generally not needed for sql.js.
    // Next.js will serve files from /public statically.
    // The previous rule for asset/resource might conflict if Webpack tries to process
    // a .wasm file from node_modules that sql.js isn't expecting to be bundled.

    return config;
  },
};

export default nextConfig;
