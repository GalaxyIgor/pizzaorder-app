import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

// Sem nonce (custo: dynamic rendering em toda página — aceitável aqui, é
// painel interno). img-src libera https: geral porque o staff cola URL
// arbitrária de imagem/logo (preview em FormProduto/FormPersonalizacao),
// não só o bucket do Supabase.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: cspHeader },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@pizzaorder/shared'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
