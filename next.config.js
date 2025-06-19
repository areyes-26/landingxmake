/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['undici']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('undici');
    }
    
    // Excluir la carpeta functions del build de Next.js de manera más robusta
    config.module.rules.push({
      test: /functions/,
      use: 'null-loader'
    });
    
    // También excluir por alias
    config.resolve.alias = {
      ...config.resolve.alias,
      'functions': false,
      './functions': false,
      '../functions': false
    };
    
    return config;
  },
  // Configuración para App Hosting - copiar archivos estáticos
  output: 'standalone',
  // Asegurar que los archivos de prompts se copien
  async rewrites() {
    return [
      {
        source: '/prompts/:path*',
        destination: '/public/prompts/:path*',
      },
    ];
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY:          process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '' ,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:       process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:   process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
                                           process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    NEXT_PUBLIC_FIREBASE_APP_ID:           process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:   process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  },
};
module.exports = nextConfig;