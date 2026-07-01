import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f7f8f4",
        foreground: "#17201a",
        panel: "#ffffff",
        line: "#dfe6db",
        muted: "#647164",
        primary: "#1f7a5a",
        accent: "#d97706",
        danger: "#b42318"
      }
    }
  },
  plugins: []
};

export default config;
