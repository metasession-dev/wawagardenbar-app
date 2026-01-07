# Logo Setup Guide

## Current Implementation

Your Wawa Garden Bar logo has been integrated into the application in the following locations:

### 1. Homepage Hero Section
- **File**: `/app/page.tsx`
- **Display**: Large centered logo (300x300px base, responsive)
- **Location**: Hero section at the top of the landing page
- **Accessibility**: Text "Wawa Garden Bar" hidden with `sr-only` for screen readers

### 2. Navigation Bar
- **File**: `/components/shared/navigation/navbar.tsx`
- **Display**: Small logo (40x40px) in the navbar
- **Location**: Top-left corner, visible on all pages
- **Responsive**: Shows on both mobile and desktop

### 3. Login Page
- **File**: `/app/(auth)/login/page.tsx`
- **Display**: Medium centered logo (120x120px base, responsive)
- **Location**: Top of login/guest checkout page
- **Accessibility**: Screen reader text included

### 4. Footer
- **File**: `/components/shared/navigation/footer.tsx`
- **Display**: Small logo (40x40px) with brand name
- **Location**: Footer brand section
- **Clickable**: Links back to homepage

### 5. Email Templates
- **File**: `/lib/email.ts`
- **Templates**: Verification PIN email & Welcome email
- **Display**: Centered logo (120px max-width)
- **Note**: Uses absolute URL from `NEXT_PUBLIC_APP_URL` environment variable
- **Brand Colors**: Updated to use #1a4d2e (brand green)

**⚠️ Important for Email Logos:**
For the logo to display in emails, ensure `NEXT_PUBLIC_APP_URL` is set in your `.env.local`:
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
This is required because email clients need an absolute URL to load images.

## Logo File Location

**Current Path**: `/public/logo.png`

### To Update Your Logo:

1. Save your logo file to: `/public/logo.png`
   - Recommended formats: PNG (with transparency) or SVG
   - For best quality, use SVG format
   - If using PNG, ensure it's high resolution (at least 600x600px)

2. If using a different filename or format:
   - Update the `src` attribute in both files:
     - `/app/page.tsx` (line 16)
     - `/components/shared/navigation/navbar.tsx` (line 62)

### Alternative: Using SVG (Recommended)

If you have an SVG version of your logo:

1. Save as `/public/logo.svg`
2. Update the image sources:
   ```tsx
   src="/logo.svg"
   ```

## Image Optimization

Next.js automatically optimizes images using the `Image` component:
- Automatic lazy loading
- Responsive sizing
- WebP format conversion (when supported)
- Priority loading on homepage (using `priority` prop)

## Additional Logo Placements (Optional)

You may want to add the logo to:
- **Favicon**: `/app/favicon.ico` - For browser tab icon
- **PWA manifest**: For mobile app icons and splash screens
- **OG Image**: For social media sharing previews
- **404/Error pages**: Custom error pages

## Color Scheme

Based on your logo:
- Primary Green: #1a4d2e (dark green)
- Accent Gold: #c9a961 (tan/gold)

Consider updating your Tailwind theme to match these colors in `tailwind.config.ts`.
