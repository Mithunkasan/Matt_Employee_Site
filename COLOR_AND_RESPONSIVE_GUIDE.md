# Website Color Scheme & Responsive Design Updates

## Overview
The entire website has been updated to use **ONLY TWO COLORS** throughout the entire application:
- **Primary Color (Navy Blue)**: `#13498a`
- **Accent/Destructive Color (Red)**: `#b12024`

## Color Implementation

### Light Mode Colors
All UI elements in light mode now use variations of these two base colors:

#### Primary Navy Blue (#13498a)
- **Primary buttons and links**: `#13498a`
- **Text color**: `#13498a`
- **Focus rings and active states**: `#13498a`
- **Sidebar primary elements**: `#13498a`

#### Light Navy Tints (for backgrounds and secondary elements)
- **Secondary backgrounds**: `#e8eef5` (very light navy)
- **Muted backgrounds**: `#f5f7fa` (ultra-light navy)
- **Borders and inputs**: `#d4dde8` (light navy)
- **Muted text**: `#6a8cb8` (medium navy)

#### Red Accents (#b12024)
- **Destructive actions** (delete, error): `#b12024`
- **Error states and warnings**: `#b12024`
- **Critical notifications**: `#b12024`

### Dark Mode Colors
Dark mode uses darker variations and lighter tints for proper contrast:

#### Dark Backgrounds
- **Main background**: `#0a1e3a` (very dark navy)
- **Card backgrounds**: `#13498a` (base navy)
- **Sidebar background**: `#0f2d52` (dark navy)
- **Muted backgrounds**: `#1a3657` (medium-dark navy)

#### Light Navy (for text and primary elements in dark mode)
- **Primary elements**: `#5a8dd1` (light navy)
- **Text color**: `#e8eef5` (very light navy)
- **Muted text**: `#9fb8d6` (light-medium navy)

#### Light Red (for destructive actions in dark mode)
- **Destructive actions**: `#d93d3f` (lighter red)

### Chart Colors
The application uses a consistent color palette for all charts and data visualizations:

#### Light Mode Charts
1. `#13498a` - Navy Blue (primary)
2. `#b12024` - Red (secondary)
3. `#2d6bb5` - Lighter Navy
4. `#d93d3f` - Lighter Red
5. `#5a8dd1` - Very Light Navy

#### Dark Mode Charts
1. `#5a8dd1` - Lighter Navy
2. `#d93d3f` - Lighter Red
3. `#2d6bb5` - Medium Navy
4. `#e66466` - Very Light Red
5. `#7aa3db` - Very Light Navy

## Responsive Design Implementation

The website is **fully responsive** and optimized for:
- 📱 **Mobile devices** (320px - 640px)
- 📱 **Tablets** (641px - 1024px)
- 💻 **Desktop** (1025px+)

### Mobile & Tablet Features

#### 1. Responsive Viewport Configuration
The application includes proper viewport meta tags for:
- Proper scaling on all devices
- Support for device notches (iPhone X+)
- Touch-friendly zoom controls
- Theme color for browser chrome

#### 2. Responsive Utility Classes
The following utility classes are available throughout the application:

**Container Classes:**
- `.container-responsive` - Responsive container with proper padding for all screen sizes

**Text Size Classes:**
- `.text-responsive-xs` to `.text-responsive-3xl` - Automatically scale text based on screen size

**Spacing Classes:**
- `.spacing-mobile` - Appropriate padding for mobile devices
- `.spacing-tablet` - Appropriate padding for tablet devices

**Grid Classes:**
- `.grid-responsive` - Single column on mobile, adapts to larger screens
- `.grid-responsive-sm-2` - 2 columns on small screens (640px+)
- `.grid-responsive-md-2` - 2 columns on medium screens (768px+)
- `.grid-responsive-md-3` - 3 columns on medium screens (768px+)
- `.grid-responsive-lg-3` - 3 columns on large screens (1024px+)
- `.grid-responsive-lg-4` - 4 columns on large screens (1024px+)

**Visibility Classes:**
- `.hidden-mobile` - Hide element on mobile, show on tablets and desktop
- `.show-mobile` - Show element only on mobile devices

**Layout Classes:**
- `.flex-responsive` - Column layout on mobile, row layout on tablets+
- `.touch-target` - Ensures minimum 44px touch target for mobile

#### 3. Mobile-Specific Optimizations

**Touch Feedback:**
- Custom tap highlighting using the navy blue color (`#13498a`)
- Proper touch target sizes (minimum 44px)

**Safe Areas:**
- Support for iPhone notch and safe areas
- Proper insets for modern mobile devices

**Performance:**
- Prevents horizontal scrolling on mobile
- Optimized scrolling behavior
- Responsive images that scale properly

**Scrollbars:**
- Custom scrollbars that match the color scheme
- Navy blue scrollbars in light mode
- Lighter navy scrollbars in dark mode

### Breakpoints
The application uses the following breakpoints:

| Device Type | Min Width | Max Width |
|------------|-----------|-----------|
| Mobile (Small) | 320px | 639px |
| Mobile (Large) / Tablet (Small) | 640px | 767px |
| Tablet | 768px | 1023px |
| Desktop (Small) | 1024px | 1279px |
| Desktop (Large) | 1280px+ | - |

## Implementation Details

### Files Modified

1. **`src/app/globals.css`**
   - Updated all CSS custom properties to use hex colors
   - Removed OKLCH color space in favor of hex for better compatibility
   - Added comprehensive responsive utility classes
   - Updated scrollbar styles to match new color scheme

2. **`src/app/layout.tsx`**
   - Added responsive viewport configuration
   - Added theme color meta tags for mobile browsers
   - Added Apple Web App configuration
   - Removed hardcoded background colors

### Color Variables Reference

All colors are defined in `src/app/globals.css` using CSS custom properties:

```css
/* Light Mode */
--primary: #13498a;
--destructive: #b12024;
--background: #ffffff;
--foreground: #13498a;
/* ... and more */

/* Dark Mode */
--primary: #5a8dd1;
--destructive: #d93d3f;
--background: #0a1e3a;
--foreground: #e8eef5;
/* ... and more */
```

## Testing Responsive Design

To test the responsive design:

1. **Browser DevTools:**
   - Open Chrome/Edge DevTools (F12)
   - Click the device toolbar icon (or Ctrl+Shift+M)
   - Test with different device presets:
     - iPhone SE (375px width)
     - iPhone 12 Pro (390px width)
     - iPad (768px width)
     - iPad Pro (1024px width)

2. **Responsive Design Mode:**
   - Drag the viewport to different widths
   - Verify layout adapts smoothly
   - Check that text remains readable
   - Ensure touch targets are large enough

3. **Real Devices:**
   - Test on actual mobile phones
   - Test on actual tablets
   - Verify touch interactions work properly

## Usage Guidelines

### For Developers

When creating new components or pages:

1. **Use CSS Custom Properties** for all colors:
   ```tsx
   className="bg-primary text-primary-foreground"
   ```

2. **Use Responsive Utility Classes** for responsive layouts:
   ```tsx
   className="grid-responsive grid-responsive-md-2 grid-responsive-lg-3"
   ```

3. **Consider Mobile-First** approach:
   - Design for mobile first
   - Add enhancements for larger screens
   - Test on multiple screen sizes

4. **Ensure Touch-Friendly**:
   - Use `.touch-target` class for buttons
   - Minimum 44px tap targets
   - Sufficient spacing between interactive elements

### Color Usage Examples

```tsx
// Primary action button
<Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
  Submit
</Button>

// Destructive action button
<Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
  Delete
</Button>

// Card with proper colors
<Card className="bg-card text-card-foreground border-border">
  Content here
</Card>
```

## Browser Compatibility

The color scheme and responsive design features are compatible with:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 90+)

## Notes

- All colors automatically adapt to dark mode
- The CSS lint warnings about `@custom-variant`, `@theme`, and `@apply` are expected and can be ignored - they are Tailwind CSS v4 directives
- The two-color scheme maintains consistency across all pages and components
- Responsive utilities are available globally and can be used in any component
