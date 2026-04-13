# CaseDive Design System

## Typography

- Headlines: Times New Roman (serif)
- Body/UI: Helvetica Neue (sans-serif)
- Code/sections: Courier New (monospace)
- Labels: Helvetica Neue, 10px, uppercase, letter-spacing 3.5px

## Colors

- Light: `#FAF7F2` bg, `#2c2825` text, `#d4a040` accent
- Dark: `#1a1814` bg, `#e8e0d0` text, `#d4a040` accent

## Implementation

- All styling is inline via `ThemeContext` — no CSS framework
- Do not add Tailwind, CSS modules, or styled-components
- Theme tokens defined in `src/lib/themes.js`
- `ThemeContext.jsx` provides theme to all components
