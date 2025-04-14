import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.growgig.app',
  appName: 'growgig',
  webDir: 'dist',
  server: {
    url: 'http://13.235.44.77',
    // cleartext: true,
    androidScheme: 'http'
  }
};

export default config;
