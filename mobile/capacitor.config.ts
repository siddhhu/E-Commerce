import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Remote URL mode: the app loads your deployed Next.js shop.
 * Update server.url after deploy, or override with CAPACITOR_SERVER_URL env at sync time.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://pranjay.com';

const config: CapacitorConfig = {
  appId: 'com.pranjay.shop',
  appName: 'Pranjay',
  webDir: 'www',
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#fff7fb',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#fff7fb',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#e91e63',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
