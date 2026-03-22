import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.breakfree.app',
  appName: 'Break Free',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#1f2937",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#3B82F6",
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: "#1f2937",
      overlaysWebView: false
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
    App: {
      url: {
        hostname: 'breakfree.app'
      }
    }
  }
};

export default config;
