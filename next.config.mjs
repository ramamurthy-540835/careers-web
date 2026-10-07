import withPWAInit from '@ducanh2912/next-pwa';
const withPWA = withPWAInit({ dest: 'public', disable: process.env.NODE_ENV === 'development', workboxOptions: { runtimeCaching: [{ urlPattern: /\/api\//, handler: 'NetworkFirst', options: { cacheName: 'api', networkTimeoutSeconds: 5 } }] } });
export default withPWA({ output: 'standalone' });
