
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
  // Add the allowed development origin to suppress cross-origin warnings
  allowedDevOrigins: ['https://6000-firebase-studio-1749929670762.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev'],
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // These modules are server-side only. Prevent them from being bundled for the client.
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^sqlite3$/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /^bindings$/ })
      );

      // Provide fallbacks for Node.js core modules that might be erroneously pulled into client bundle
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
    }
    return config;
  },
};

export default nextConfig;
