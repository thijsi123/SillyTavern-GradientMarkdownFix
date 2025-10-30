# SillyTavern Gradient Markdown Fix

A SillyTavern extension that shows gradient coloring on unclosed markdown to indicate what would be auto-fixed, without requiring the built-in Auto-fix Markdown feature to be enabled.

## Features

- **Works WITHOUT Auto-fix Markdown enabled**: Shows gradients on unclosed markdown that would be fixed
- **Theme-aware gradients**: Uses your theme colors for smooth transitions
- **Customizable warning colors**: Choose your own warning color for the gradient
- **Persistent gradients**: No animations, just clear visual indicators
- **Real-time detection**: Automatically detects and styles unclosed markdown

## Installation

### Method 1: URL Installation (Recommended)

1. In SillyTavern, go to **Extensions** → **Extensions Gallery**
2. Click **Install from URL**
3. Enter the URL: `https://raw.githubusercontent.com/[YOUR_USERNAME]/SillyTavern-GradientMarkdownFix/main/manifest.json`
4. Click **Install**

### Method 2: Manual Installation

1. Download the extension files
2. Place them in your SillyTavern extensions directory:
   - **Global**: `public/scripts/extensions/third-party/SillyTavern-GradientMarkdownFix/`
   - **User-specific**: `data/[username]/extensions/SillyTavern-GradientMarkdownFix/`
3. Restart SillyTavern

## Usage

1. **Disable Auto-fix Markdown**: Go to Settings → Power User and disable "Auto-fix Markdown"
2. **Enable the extension**: Go to Extensions and enable "Gradient Markdown Fix"
3. **Customize settings**: Click the extension button to access settings:
   - Enable/disable the extension
   - Set warning color
   - Toggle persistent gradients

## How It Works

The extension detects unclosed markdown (quotes, italics, bold, etc.) and applies a horizontal gradient from the original theme color to a warning color. This shows you exactly what text would be auto-fixed if the built-in feature was enabled.

### Example

If you have unclosed quotes like:
```
"This is an unclosed quote
```

The text will show a gradient from your quote color to the warning color, indicating it needs fixing.

## Settings

- **Enable Gradient Markdown Fix**: Toggle the extension on/off
- **Warning Color**: Choose the color for the gradient warning end
- **Persistent Gradient**: Keep gradients permanently visible (no animations)

## Files

- `manifest.json` - Extension metadata
- `index.js` - Main extension logic
- `README.md` - This documentation

## License

MIT License