import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'custom-brown': '#775948',
        'custom-sand': '#d5c17c',
        'custom-teal': '#48a4a8',
        'custom-rose': '#d56373',
        'custom-green': '#3eb95e',
      },
    },
  },
  plugins: [],
} satisfies Config;
