# Quick Component Test Guide

## 🚀 Start Testing in 3 Steps

### 1. Start Server
```bash
npm run dev
```

### 2. Test These URLs

| Page | URL | What to Check |
|------|-----|---------------|
| **Home** | http://localhost:3000 | Hero, feature cards, buttons |
| **Login** | http://localhost:3000/login | Login form, guest form, tabs |
| **Menu** | http://localhost:3000/menu | Navbar, footer, coming soon |
| **Orders** | http://localhost:3000/orders | Empty state, browse button |
| **Rewards** | http://localhost:3000/rewards | Reward tiers, coming soon |
| **Test** | http://localhost:3000/test-components | All components showcase |

### 3. Quick Checks

#### ✅ Login Page Works
1. Go to http://localhost:3000/login
2. See "Sign In" and "Guest" tabs
3. Forms are visible and styled
4. Can type in email fields

#### ✅ Navigation Works
1. Click navbar links
2. Resize browser to mobile (<768px)
3. See hamburger menu
4. Menu slides from right

#### ✅ Components Display
1. Go to http://localhost:3000/test-components
2. See all button variants
3. Click "Show Success Toast" → toast appears
4. Click "Open Auth Dialog" → modal opens

---

## 🎯 Login Flow Test (Without Backend)

**Note:** Full authentication requires environment setup. This tests UI only.

1. Visit http://localhost:3000/login
2. Click "Sign In" tab
3. Enter email: `test@example.com`
4. Click "Continue"
5. **Expected:** Form switches to PIN input
6. Enter PIN: `1234`
7. Click "Verify & Login"
8. **Expected:** Loading state, then error (no backend yet)

---

## 📱 Mobile Test

1. Open DevTools (F12)
2. Click device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Visit http://localhost:3000
5. **Check:**
   - Hamburger menu visible
   - Cards stack vertically
   - Text is readable
   - Buttons are tappable

---

## ✅ All Components Verified

If you can see and interact with:
- ✅ Buttons (all variants)
- ✅ Cards with content
- ✅ Forms with inputs
- ✅ Toast notifications
- ✅ Auth dialog/modal
- ✅ Navigation bar
- ✅ Mobile menu
- ✅ Footer

**Then all UI components are working!** 🎉

---

## 🔧 If Something Doesn't Work

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Restart dev server** (Ctrl+C, then `npm run dev`)
3. **Check browser console** for errors (F12)
4. **Verify all files saved** in your editor

---

## 📝 What's Ready

✅ All UI components installed and working  
✅ Login/registration pages created  
✅ Navigation with mobile menu  
✅ Forms with validation styling  
✅ Toast notifications  
✅ Loading states  
✅ Error handling  
✅ Responsive design  

## 🚧 What Needs Setup for Full Auth

⏳ Environment variables (`.env.local`)  
⏳ MongoDB connection  
⏳ Email service (Zoho SMTP)  

**But the UI is 100% ready to test!**
