# Centralized Theme System

## Overview
A centralized theme management system has been implemented for the Expense Manager PWA. All colors, typography, spacing, and component-specific values are now managed from a single source.

## Files

### 1. **css/theme-variables.css** (Main Theme Definition)
Contains all CSS custom properties (variables) organized by category:
- **Colors**: Primary, backgrounds, text, borders, status
- **Typography**: Font sizes (xs-4xl), weights (light-extrabold), family
- **Spacing**: xs-3xl (4px-32px)
- **Radius**: sm-full (8px-999px)
- **Shadows**: sm-xl for different elevation levels
- **Transitions**: Fast, base, slow, slower with easing functions
- **Z-Index**: Proper layering for modals, headers, overlays
- **Component Heights**: Header, tab bar, FAB sizes

### 2. **js/theme.js** (JavaScript Theme Configuration)
- Complete theme object with all values
- `getCSSVariables()` function to generate CSS custom properties
- Can be imported in components for dynamic styling
- Useful for complex JavaScript calculations

## Usage

### In CSS Files
```css
/* Example usage in any CSS */
background: var(--color-bg-card);
color: var(--color-text-primary);
padding: var(--spacing-md);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-md);
transition: all var(--transition-base) var(--easing);
```

### In HTML
```html
<!-- Already imported in index.html -->
<link rel="stylesheet" href="./css/theme-variables.css">

<div style="background: var(--color-bg-base); padding: var(--spacing-lg);">
  <!-- Content -->
</div>
```

### In JavaScript Components
```javascript
import { THEME } from "../js/theme.js";

class MyComponent extends HTMLElement {
  render() {
    const color = THEME.colors.primary;
    const size = THEME.typography.sizes.lg;
    // Use in template literals or dynamically
  }
}
```

## Color Palette

### Primary Colors
- `--color-primary`: #2563eb (Blue)
- `--color-secondary`: #06b6d4 (Cyan)
- `--color-accent`: #2dd4bf (Teal)

### Status Colors
- `--color-success`: #10b981 (Green)
- `--color-warning`: #f59e0b (Amber)
- `--color-error`: #ef4444 (Red)
- `--color-destructive`: #fb7185 (Rose)

### Semantic Colors
- Online: #10b981
- Offline: #64748b
- Positive: #10b981
- Negative: #fb7185

## Benefits

1. **Consistency**: All colors and styles consistent across components
2. **Maintainability**: Change one value, updates everywhere
3. **Scalability**: Easy to add dark/light mode switching
4. **Performance**: CSS variables are faster than JavaScript calculations
5. **Development**: Quick theming iterations
6. **Accessibility**: Centralized color ratios for contrast

## How to Extend

### Add New Color
```css
/* In css/theme-variables.css */
--color-custom-name: #hexvalue;
```

### Add New Spacing
```css
--spacing-4xl: 36px;
```

### Add New Component Values
```javascript
// In js/theme.js
components: {
  myComponent: {
    height: '100px',
    padding: '20px',
  }
}
```

## Migration Path

Existing components should gradually adopt theme variables:
- app-header.js: Ready to use `THEME` (import added)
- home-screen.js: Can use CSS variables in shadow DOM
- tab-bar.js: Ready for theme integration
- Other components: Import and implement as needed
