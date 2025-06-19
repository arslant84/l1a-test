
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
    // Required for sql.js to load its Wasm file
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, // fs is not available in the browser
      path: false, // path is not available in the browser
      // sql.js might need other fallbacks, add them here if build errors occur
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

    // Rule to handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource", // This tells Webpack to treat .wasm files as assets
      generator: {
        filename: 'static/wasm/[name][ext]' // Optional: control output path/name
      }
    });
    
    // experiments.asyncWebAssembly is deprecated, direct wasm rule is preferred
    // config.experiments = { ...config.experiments, asyncWebAssembly: true };


    return config;
  },
};

export default nextConfig;
