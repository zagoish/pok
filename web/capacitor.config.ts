import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokemonleague.splendor',
  appName: '宝可梦宝石联赛',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
