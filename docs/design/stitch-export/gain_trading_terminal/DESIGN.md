---
name: GAIN Trading Terminal
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#bfc7d2'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#89929b'
  outline-variant: '#3f4850'
  surface-tint: '#93ccff'
  primary: '#93ccff'
  on-primary: '#003351'
  primary-container: '#3198dc'
  on-primary-container: '#002c47'
  inverse-primary: '#006398'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#bdc2ff'
  on-tertiary: '#131e8c'
  tertiary-container: '#7c87f3'
  on-tertiary-container: '#081486'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#2f3aa3'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  ticker-xl:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  ticker-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  ticker-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  ticker-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-dense: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style
The design system embodies institutional-grade digital asset execution wrapped in an ultra-refined, high-density modern fintech interface. It serves high-frequency crypto traders, retail investors, and simulated portfolio operators who demand laser-sharp precision, low latency visual feedback, and zero ambiguity.

### Aesthetic Movement
The aesthetic synthesizes **Technical High-Contrast Modernism** with subtle **Bento Precision**. It avoids decorative fluff in favor of razor-thin crisp architectural borders, deep multi-layered obsidian surfaces, luminous functional accents, and monospaced numerical discipline. Visual feedback is immediate: gains flash crisp emerald, sell pressures cut through in vivid crimson, and paper trading actions remain decisively categorized with distinct indigo signatures.

### Atmosphere & Polish
- **Precision Engineered**: High data density balanced by strict typographic hierarchies and deliberate spatial separation.
- **Controlled Luminescence**: Glowing states and translucent color-washes are strictly functional, reserved for live execution cues, depth-chart levels, and simulated state notifications.
- **Institutional Weight**: Dark themes often become muddy; this system leverages crisp slate tiers with targeted contrast borders to retain clean spatial layering under prolonged trading sessions.

## Colors
The palette is built on deep structural slate-obsidians punctuated by ultra-vibrant, high-contrast semantic indicators that satisfy strict financial UI accessibility (WCAG AA+ against dark surfaces).

### Surface & Neutral Architecture
- **Obsidian Base (`#0B0F17`)**: Canvas background, viewport borders, and recessed table views.
- **Slate Elevate 1 (`#131B2A`)**: Primary card containers, order books, panel frames, and chart containers.
- **Slate Elevate 2 (`#1B2538`)**: Active hover states, interactive widget modules, input fields, and tab clusters.
- **Border Structural (`#233047`)**: High-contrast divider borders, data grids, and component contours.
- **Border Subtle (`#172338`)**: Secondary horizontal divider rules inside tables and module splits.

### Financial Action & Functional Accents
- **Primary Execution Sky (`#0284C7` / `#38BDF8`)**: Primary trade triggers, selected states, buy tabs, and primary callouts.
- **Positive / Buy Emerald (`#10B981`)**: Bullish volume, bid ribbons, positive PnL percentage changes, long indicators.
- **Negative / Sell Crimson (`#EF4444`)**: Bearish pressure, ask ribbons, negative PnL percentage changes, short indicators.
- **Warning / Alert Amber (`#F59E0B`)**: Slippage alerts, liquidation proximities, margin call warnings, unconfirmed states.
- **Simulation Indigo (`#818CF8`)**: Paper trading banner indicators, demo balance chips, virtual simulated transaction feeds.

### Text & Data Legibility
- **Text Highest (`#F8FAFC`)**: Real-time ticker values, aggregate balance headers, primary CTA text.
- **Text Secondary (`#94A3B8`)**: Field identifiers, market pairs, table header legends, timestamps.
- **Text Muted (`#475569`)**: Inactive options, max decimals, structural metadata, chart scale indicators.

## Typography
Typographic precision is essential to eliminate misreads during high-stress trading events. The system splits duties between two specialized typefaces:

1. **Inter**: General interface copy, modal structures, navigation labels, and button labels. OpenType feature `cv05` (l/I disambiguation) and `tnum` (tabular numbers) must be activated across all numerical tables.
2. **JetBrains Mono**: Exclusively reserved for dynamic ticker values, order book depth rows, percentage spreads, candle open-high-low-close (OHLC) prints, and wallet hashes.

### Rules for Number Formatting
- **Aligned Tabular Columns**: Every numeric order book column must use uniform monospaced glyph metrics to prevent jitter during live WebSocket updates.
- **Negative Sign Integrity**: Use standard minus glyphs (`−`, U+2212) rather than hyphens to preserve optical centering with JetBrains Mono numbers.
- **Casing**: UI meta-labels (e.g., `24H VOLUME`, `AVG ENTRY`, `EST. SLIPPAGE`) must strictly follow `label-caps` styling with `0.06em` letter spacing.

## Layout & Spacing
The layout uses a multi-tiered responsive grid built for real-time monitoring and high-density financial data visualization.

### Desktop Trading Terminal (>= 1280px)
- Multi-column fluid docking system:
  - **Left Rail (Fixed 280px or 320px)**: Market selector, pair search, 24h stats.
  - **Center Canvas (Fluid)**: Dynamic candlestick/depth charts stacked atop order history, open positions, and transaction logs.
  - **Right Rail (Fixed 360px)**: Vertically split between the live dual-sided Order Book (Top/Bottom) and the Buy/Sell execution ticket.
- System gaps employ `gutter-dense` (`0.5rem`) within operational trading panels to maximize visible information per pixel without visual friction.

### Tablet & Compact Desktop (768px - 1279px)
- Shift to stacked modular bento layout. The chart and order form take priority; order books collapse into split-tab overviews with drawer-based position monitors.

### Mobile Viewport (< 768px)
- Single-column continuous canvas utilizing `margin-mobile` (`0.75rem`).
- The bottom viewport area is anchored by persistent dual execution buttons (`BUY / LONG` in `#10B981` and `SELL / SHORT` in `#EF4444`) activating modal transaction sheets.

## Elevation & Depth
Depth in this design system is created through physical stacking, high-contrast structural containment borders, and selective inner ambient lighting, avoiding muddy, scattered drop shadows.

### Elevation Levels
- **Base Level (`0`) - `#0B0F17`**: Root canvas. Unbordered, matte, absorbs visual weight.
- **Surface Level (`1`) - `#131B2A`**: Standard container tiles. Outlined by `1px solid #233047`. No external drop shadow.
- **Interactive Elevated Level (`2`) - `#1B2538`**: Dropdowns, active inputs, and hovering cards. Outlined by `1px solid #38BDF8` (low opacity `0.3`) with an internal light inset: `inset 0px 1px 0px 0px rgba(255, 255, 255, 0.06)`.
- **Overlay & Modal Level (`3`) - `#131B2A`**: Floating confirmation screens, leverage dialogs, and paper trading configuration panels. Shadow definition: `0px 20px 40px -8px rgba(3, 7, 18, 0.7), 0px 0px 0px 1px #233047`.

### Subtle Inner Glows & Status Halos
- **Active Trade Focus**: Inputs receiving user keystrokes receive an outer focus glow: `0px 0px 0px 1px #0284C7, 0px 0px 16px -2px rgba(2, 132, 199, 0.4)`.
- **Simulation Ambience**: When operating within paper trading mode, a delicate internal perimeter gradient `inset 0px 2px 0px 0px #818CF8` anchors the primary terminal header.

## Shapes
The system strikes a refined balance between architectural solidity and contemporary digital feel, using `rounded-xl` (`1rem`) and `rounded-2xl` (`1.5rem`) for macro frames, while retaining compact `0.375rem` - `0.5rem` radii for rapid-action buttons and inputs.

- **Primary Bento Tiles & Dashboard Cards**: `rounded-2xl` (`1.5rem` / `24px`). Provides a friendly yet structured enclosure for complex chart canvases.
- **Execution Cards & Order Modules**: `rounded-xl` (`1rem` / `16px`).
- **Interactive Buttons, Inputs, & Dropdowns**: Standard `0.5rem` (`8px`) radius to balance tactile usability with space preservation.
- **Status Badges & Indicator Tags**: Full pill radius (`9999px`) for quick visual identification against dense rectangular data grids.

## Components

### 1. Buttons
- **Primary Action (Brand Execution)**: `#0284C7` background, `#F8FAFC` label, `8px` corner radius. On hover, background shifts to `#38BDF8` with a subtle cyan glow.
- **Buy / Long Button**: High-visibility `#10B981` background, `#0B0F17` ultra-bold label, `8px` corner radius. Hover elevates brightness by 8%.
- **Sell / Short Button**: `#EF4444` background, `#F8FAFC` label, `8px` corner radius. Hover elevates brightness by 8%.
- **Secondary / Ghost Button**: Fully transparent background, `1px solid #233047`, `#94A3B8` text. Hover transitions border to `#38BDF8` and text to `#F8FAFC`.

### 2. Paper Trading Indicator Badges
- **Simulated Execution Badge**: Pill container styled with `rgba(129, 140, 248, 0.12)` background, `1px solid #818CF8`, `#818CF8` monospaced label with a flashing `6px` circular beacon dot in `#818CF8`.
- Accompanied by a persistent top-tier indicator bar informing users that assets and trades hold no real-world capital risk.

### 3. Input Fields & Steppers
- **Container**: Slate background (`#131B2A`), border `1px solid #233047`, `8px` radius.
- **Typography**: Value aligned right in `JetBrains Mono` (`ticker-md`), currency denomination prefix/suffix locked in muted Inter (`#94A3B8`).
- **Quick Percentage Steps**: Clustered 25%, 50%, 75%, 100% chip buttons nestled directly beneath the balance input using `#1B2538` background, transitioning to `#0284C7` on select.

### 4. Order Book Components
- Dual-column structure (Bids Left/Asks Right or stacked vertically).
- **Depth Visualizer**: Subtle absolute background percentage fill using `rgba(16, 185, 129, 0.12)` for buy depth and `rgba(239, 68, 68, 0.12)` for sell depth.
- Monospaced numeric alignment via `ticker-sm` ensures zero horizontal jitter during continuous price discovery.

### 5. Cards & Bento Units
- Background `#131B2A`, border `1px solid #233047`, padding `space-md` (`1rem`) to `space-lg` (`1.5rem`), `rounded-2xl`.
- Header rows feature a crisp divider line (`#172338`) separating metadata parameters from data-heavy chart or order feeds.

### 6. Toggle Switches & Segmented Selectors
- **Market / Limit / Stop-Loss Mode Selectors**: Segmented container in `#0B0F17` with `8px` radius. Active option slides with `#1B2538` elevation, `1px solid #233047`, and vibrant `#38BDF8` text accent.