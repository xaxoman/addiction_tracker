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
      backgroundColor: "#0A1712",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#19583B",
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: "#0A1712",
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
