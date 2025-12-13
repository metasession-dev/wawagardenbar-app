# Breadcrumb Navigation

## Overview
Added breadcrumb navigation to the dashboard to improve user orientation and navigation within the admin interface.

## Implementation Date
December 13, 2025

## Features

### 🧭 Smart Path Generation
- Automatically generates breadcrumbs from the current URL path
- Intelligently formats route segments into readable labels
- Skips MongoDB ObjectIDs and order IDs in the breadcrumb trail

### 🏠 Home Link
- Dashboard home icon (Home) always appears as the first item
- Quick navigation back to dashboard root

### 🎨 Visual Design
- Clean, minimal design with chevron separators
- Hover states for interactive elements
- Current page highlighted with bold text
- Muted colors for non-active items
- Smooth transitions on hover

### 📱 Responsive
- Works seamlessly on all screen sizes
- Compact design that doesn't clutter the interface

## Route Label Mappings

The breadcrumb component includes intelligent label mappings for common routes:

| Route Segment | Display Label |
|--------------|---------------|
| `dashboard` | Dashboard |
| `orders` | Orders |
| `menu` | Menu |
| `inventory` | Inventory |
| `customers` | Customers |
| `rewards` | Rewards |
| `settings` | Settings |
| `audit-logs` | Audit Logs |
| `kitchen` | Kitchen Display |
| `analytics` | Analytics |
| `tabs` | Tabs |
| `new` | New |
| `edit` | Edit |
| `reports` | Reports |
| `daily` | Daily Reports |
| `finance` | Finance |
| `expenses` | Expenses |
| `rules` | Rules |
| `templates` | Templates |
| `issued` | Issued Rewards |
| `issue` | Issue Reward |
| `admins` | Admin Users |
| `data-requests` | Data Deletion Requests |
| `history` | Order History |
| `checkout` | Checkout |

## Example Breadcrumb Trails

### Order Management
```
🏠 > Orders
🏠 > Orders > Tabs
🏠 > Orders > Tabs > Checkout
🏠 > Orders > Analytics
```

### Menu Management
```
🏠 > Menu
🏠 > Menu > New
🏠 > Menu > Edit
```

### Rewards System
```
🏠 > Rewards
🏠 > Rewards > Rules
🏠 > Rewards > Rules > New
🏠 > Rewards > Issued
🏠 > Rewards > Templates
```

### Settings
```
🏠 > Settings
🏠 > Settings > Admins
🏠 > Settings > Data Requests
```

### Inventory
```
🏠 > Inventory
```

### Reports
```
🏠 > Reports
🏠 > Reports > Daily
```

## Files Created/Modified

### New Files
- `/components/shared/breadcrumb.tsx` - Main breadcrumb component

### Modified Files
- `/app/dashboard/layout.tsx` - Integrated breadcrumb into dashboard layout

## Component Structure

```typescript
<Breadcrumb />
```

### Key Functions

#### `generateBreadcrumbs(pathname: string)`
- Parses the current pathname
- Filters out dynamic segments (IDs)
- Maps segments to readable labels
- Returns array of breadcrumb items

#### `formatSegment(segment: string)`
- Converts kebab-case to Title Case
- Example: `audit-logs` → `Audit Logs`

## Styling

### Colors
- **Non-active items**: `text-muted-foreground`
- **Active (current) item**: `text-foreground font-medium`
- **Hover state**: `hover:text-foreground`

### Icons
- **Home icon**: 16x16px (h-4 w-4)
- **Chevron separators**: 16x16px (h-4 w-4)

### Spacing
- Breadcrumb container: `mb-6` (24px bottom margin)
- Items spacing: `space-x-1` (4px horizontal gap)

## Accessibility

- ✅ Semantic `<nav>` element with `aria-label="Breadcrumb"`
- ✅ Current page marked with `aria-current="page"`
- ✅ Home link has `aria-label="Dashboard Home"`
- ✅ Keyboard navigable (all links are focusable)
- ✅ Screen reader friendly

## Behavior

### Visibility
- **Hidden** on dashboard home (`/dashboard`)
- **Visible** on all sub-pages

### Navigation
- All breadcrumb items are clickable links (except current page)
- Clicking navigates to that level in the hierarchy
- Home icon always links to `/dashboard`

## Future Enhancements

### Potential Improvements
1. **Dynamic Titles**: Fetch actual item names for IDs (e.g., show menu item name instead of skipping ID)
2. **Dropdown Menus**: Add dropdown for sibling pages at each level
3. **Customization**: Allow pages to override breadcrumb labels via metadata
4. **Icons**: Add contextual icons for different sections
5. **Mobile Optimization**: Collapse to dropdown on very small screens

### Example: Dynamic Titles
```typescript
// Instead of: 🏠 > Orders
// Show: 🏠 > Orders > Order #WGB28057610
```

## Testing Checklist

- [x] Breadcrumbs appear on all dashboard sub-pages
- [x] Breadcrumbs hidden on dashboard home
- [x] All links navigate correctly
- [x] Current page is not clickable
- [x] Home icon links to dashboard
- [x] Labels are readable and properly formatted
- [x] Hover states work correctly
- [x] Responsive on mobile/tablet/desktop
- [x] Accessible via keyboard navigation
- [x] Screen reader compatible

## Performance

- **Client Component**: Uses `usePathname()` hook for reactivity
- **No API Calls**: All breadcrumb generation is client-side
- **Minimal Re-renders**: Only updates when pathname changes
- **Lightweight**: Small bundle size (~2KB)

---

**Implemented By**: Cascade AI Assistant  
**Approved By**: William  
**Status**: ✅ Completed
