import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stokeyange.app",
  appName: "Stoke Yange",
  // Produced by the dedicated native SPA build. Do not set server.url:
  // the application UI must load from files packaged inside the native app.
  webDir: ".output/public",
  backgroundColor: "#FAF8F5",
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#FAF8F5",
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
