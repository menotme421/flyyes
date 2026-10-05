# Frontend Design Rules — Follow These at All Times

## UI Framework: shadcn/ui + Tailwind CSS
- Components are copied into the project (not installed as dependency), so we own and can modify them.
- Use `npx shadcn@latest add [component]` to add new components.
- All theming is done through CSS variables in globals.css.
- Extend the design system in tailwind.config.ts.
- Use `cn()` utility for conditional class merging.
- Follow shadcn's component patterns when building custom components.

## 1. Design System — Establish First, Code Later
- Before building any UI, define a design system:
  - Color palette (primary, secondary, accent, success, warning, error, neutral/gray scale)
  - Typography scale (font family, sizes for h1-h6, body, small, line-heights)
  - Spacing scale (use a consistent system: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
  - Border radius values (small, medium, large, full)
  - Shadow levels (small, medium, large)
  - Breakpoints for responsive design
- Store ALL design tokens in a single config file (e.g., tailwind.config, CSS variables, or theme file). NEVER hardcode colors, font sizes, or spacing values directly in components.

## 2. Layout & Spacing
- Use a consistent grid system (e.g., 12-column grid or CSS Grid/Flexbox).
- Maintain generous whitespace. When in doubt, add MORE space, not less.
- Use consistent spacing between sections, cards, and elements.
- Every page should have a clear visual hierarchy: 
  Primary action > Secondary info > Supporting details
- Content should have a max-width (e.g., 1200px-1400px) and be centered. Never let text lines stretch across the full width of a wide screen.
- Maintain a consistent page padding/margin on all pages.

## 3. Typography
- Use a maximum of 2 font families (1 for headings, 1 for body — or just 1 for everything).
- Establish a clear type hierarchy and use it consistently across all pages:
  - Page title (h1) — only ONE per page
  - Section titles (h2)
  - Sub-sections (h3)
  - Body text
  - Small/caption text
- Body text minimum 16px. Never go below 14px for any readable text.
- Line height for body text: 1.5-1.7. For headings: 1.1-1.3.
- Maximum line width for readability: 60-75 characters per line.
- Use font-weight to create contrast, not just size.

## 4. Color
- Use color purposefully, not decoratively:
  - Primary color: main actions (CTA buttons, active states, links)
  - Success (green): confirmations, completed states
  - Warning (yellow/amber): caution states
  - Error (red): errors, destructive actions, required fields
  - Neutral/gray: borders, backgrounds, secondary text
- Background colors should be subtle. Main background: white or very light gray (#f9fafb or similar).
- Ensure sufficient color contrast ratios:
  - Normal text: minimum 4.5:1 contrast ratio against background
  - Large text / headings: minimum 3:1
- Never use color as the ONLY way to convey information (accessibility).
- Limit bright/saturated colors to small elements (buttons, badges, icons). Large areas should use muted/light tones.

## 5. Components — Consistency is King
- Every component of the same type must look and behave identically across the entire app:
  - All buttons of the same level must have the same padding, font-size, border-radius, and hover effect
  - All cards must have the same shadow, padding, and border-radius
  - All form inputs must have the same height, border style, focus state, and error state
- Button hierarchy (always maintain this):
  - Primary: filled with primary color (1 per section, main action)
  - Secondary: outlined or muted (supporting actions)
  - Ghost/Text: minimal styling (tertiary actions)
  - Destructive: red, for delete/remove actions
- Button sizes should be comfortable for touch: minimum height 40px, ideally 44-48px.
- Form inputs:
  - Clear labels above inputs (not just placeholders)
  - Visible focus states (outline or border color change)
  - Error messages below the input in red, with helpful text
  - Consistent height across all input types (input, select, textarea first row)
  - Adequate padding inside inputs (12px-16px)

## 6. Responsive Design — Mobile First
- Design mobile layout FIRST, then scale up to tablet and desktop.
- Breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- Navigation: use hamburger menu or bottom nav on mobile. Full nav on desktop.
- Touch targets on mobile: minimum 44x44px.
- Test that no horizontal scrolling exists at any breakpoint.
- Stack columns vertically on mobile. Side-by-side on desktop.
- Font sizes, padding, and margins should adjust per breakpoint — don't use the same values everywhere.
- Images must be responsive (max-width: 100%, height: auto).
- Tables on mobile: either make horizontally scrollable OR reformat into card layout.

## 7. Navigation & Information Architecture
- User should always know:
  - Where they are (active nav state, breadcrumbs, page titles)
  - Where they can go (clear navigation, visible CTAs)
  - How to go back (back buttons, breadcrumbs, browser back should work)
- Navigation should be consistent on every page — same position, same structure.
- Maximum nav depth: 3 levels. If deeper, restructure the information architecture.
- Important actions should be reachable within 2-3 clicks from the homepage.
- Use clear, action-oriented labels for navigation items ("Dashboard", "Settings", not "Misc" or "Other").

## 8. Feedback & Interaction
- Every user action must have visible feedback:
  - Button click → loading state (spinner or disabled + "Saving...")
  - Form submit success → success toast/message
  - Form submit error → clear error message explaining what went wrong
  - Hover on interactive elements → cursor change + visual change
  - Page loading → skeleton screens or loading indicators (never a blank page)
- Toast/notification messages:
  - Success: green, auto-dismiss after 3-5 seconds
  - Error: red, persistent until user dismisses
  - Position consistently (e.g., always top-right)
- Destructive actions (delete, remove) must have a confirmation dialog.
- Disabled buttons should look visibly disabled (reduced opacity) and have a tooltip explaining WHY it's disabled.

## 9. Empty States & Edge Cases
- Always design for:
  - Empty state: no data yet (show illustration + message + CTA to create first item)
  - Loading state: data is being fetched
  - Error state: something went wrong (with retry option)
  - No results: search/filter returned nothing (suggest clearing filters)
  - Long content: text overflow, very long names/titles (use truncation with tooltip)
  - Single item vs many items: layout should work with 1 item AND 100 items
- Never show a blank white page or an empty table with just headers.

## 10. Accessibility Basics
- All images must have alt text.
- All interactive elements must be keyboard accessible (Tab, Enter, Escape).
- Use semantic HTML elements (nav, main, section, article, button — not div for everything).
- Focus states must be visible (never set outline: none without a replacement).
- Form inputs must have associated label elements.
- Modals must trap focus and close on Escape key.
- Use aria-labels where visual context is missing (icon-only buttons).

## 11. Visual Polish & Professionalism
- Alignment: elements should align to a grid. Nothing should look "off" by a few pixels.
- Consistent icon style: don't mix outlined and filled icons. Pick one icon set and stick with it (e.g., Lucide, Heroicons, Phosphor).
- Icon size should match the context (16px inline with text, 20-24px in buttons, 32-48px as feature icons).
- Use subtle transitions/animations:
  - Hover effects: 150-200ms ease
  - Modal/dropdown appearance: 150-200ms ease
  - Page transitions: 200-300ms
  - Never use jarring or slow animations (>500ms)
- Cards and elevated elements: use subtle shadows, not thick borders.
- Avoid visual clutter: if a page feels busy, remove elements rather than adding more styling.

## 12. Dark Mode (if applicable)
- Don't just invert colors. Design a proper dark palette:
  - Background: dark gray (#0f172a, #1e293b), not pure black (#000)
  - Text: light gray (#e2e8f0, #f1f5f9), not pure white (#fff)
  - Reduce shadow intensity in dark mode
  - Ensure all color contrasts still meet accessibility standards
- Persist user's theme preference in localStorage.
- Respect system preference as default (prefers-color-scheme).

## 13. Implementation Rules
- Use a component-based approach: build reusable components (Button, Input, Card, Modal, etc.) FIRST, then compose pages from them.
- Never style the same component differently by copying CSS. Create variants within the component (e.g., Button variant="primary" vs variant="secondary").
- All spacing, colors, sizes must come from the design system tokens. If a value doesn't exist in the system, ADD it to the system rather than hardcoding.