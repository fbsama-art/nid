import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nid.abonnements",
  appName: "Nid",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#2F4A3C",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f3efe6",
    },
  },
};

export default config;
