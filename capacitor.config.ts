import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.juzoor.app",
  appName: "جذور",
  webDir: "out",
  backgroundColor: "#0F6766",
  android: {
    backgroundColor: "#F8FAFC",
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
