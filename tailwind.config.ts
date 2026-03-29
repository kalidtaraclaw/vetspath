import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        aquia: {
          'midnight': '#030940',
          'royal': '#050F69',
          'azure': '#2071C6',
          'sky': '#68B4E7',
          'silver': '#CECBD2',
          'ice': '#E7F1FB',
          'offwhite': '#FAFAFA',
          'orange': '#CC5800',
          'crimson': '#E11A0C',
          'gold': '#FFC107',
          'amethyst': '#7751A8',
        },
      },
    },
  },
  plugins: [],
}
export default config
