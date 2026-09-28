const colors = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');

// Dark mode works by swapping palette shades instead of adding dark: variants
// everywhere: in dark mode the light shades (backgrounds, tints) and the dark
// shades (text) trade places, while the mid shades used for buttons, icons and
// links stay put. Every color below is a CSS variable, set in :root and .dark.

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Grays also swap 600/400 so secondary text stays readable on dark backgrounds.
const GRAY_SWAP = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 500, 500: 400, 600: 400, 700: 300, 800: 200, 900: 100, 950: 50 };
const COLOR_SWAP = { 50: 950, 100: 900, 200: 800, 300: 700, 700: 300, 800: 200, 900: 100, 950: 50 };

const PALETTES = {
  gray: colors.gray,
  primary: colors.blue,
  blue: colors.blue,
  red: colors.red,
  green: colors.green,
  yellow: colors.yellow,
  purple: colors.purple,
  indigo: colors.indigo,
};

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

function paletteVars(dark) {
  const vars = {};
  for (const [name, palette] of Object.entries(PALETTES)) {
    const swap = name === 'gray' ? GRAY_SWAP : COLOR_SWAP;
    for (const shade of SHADES) {
      const source = dark && swap[shade] ? swap[shade] : shade;
      vars[`--c-${name}-${shade}`] = rgb(palette[source]);
    }
  }
  // Cards, panels and inputs; the page background is gray-50.
  vars['--c-surface'] = dark ? rgb(colors.gray[900]) : '255 255 255';
  return vars;
}

const themeColors = Object.fromEntries(
  Object.keys(PALETTES).map((name) => [
    name,
    Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`])),
  ])
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...themeColors,
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': { ...paletteVars(false), colorScheme: 'light' },
        '.dark': { ...paletteVars(true), colorScheme: 'dark' },
      });
    }),
  ],
};
