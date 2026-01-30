import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores da marca Roboroça
        'robo-blue': {
          50: '#e6eef5',
          100: '#ccdceb',
          200: '#99b9d6',
          300: '#6696c2',
          400: '#3373ad',
          500: '#1B3A5C',
          600: '#162e4a',
          700: '#102337',
          800: '#0b1725',
          900: '#050c12',
        },
        'robo-green': {
          50: '#f0f7e9',
          100: '#e1efd3',
          200: '#c3dfa7',
          300: '#a5cf7b',
          400: '#87bf4f',
          500: '#6AAF3D',
          600: '#558c31',
          700: '#406925',
          800: '#2a4618',
          900: '#15230c',
        },
      },
    },
  },
  plugins: [],
}
export default config
