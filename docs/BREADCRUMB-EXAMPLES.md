# Breadcrumb Navigation Examples

## Visual Examples

### Dashboard Home
```
(No breadcrumb shown - you're already at the root)
```

### Orders Page
```
🏠 > Orders
```

### Tabs Management
```
🏠 > Orders > Tabs
```

### Tab Checkout
```
🏠 > Orders > Tabs > Checkout
```

### Kitchen Display
```
🏠 > Kitchen Display
```

### Menu Management
```
🏠 > Menu
```

### Create New Menu Item
```
🏠 > Menu > New
```

### Edit Menu Item
```
🏠 > Menu > Edit
```

### Inventory
```
🏠 > Inventory
```

### Customers
```
🏠 > Customers
```

### Rewards Dashboard
```
🏠 > Rewards
```

### Reward Rules
```
🏠 > Rewards > Rules
```

### Create New Reward Rule
```
🏠 > Rewards > Rules > New
```

### Issued Rewards
```
🏠 > Rewards > Issued
```

### Issue New Reward
```
🏠 > Rewards > Issue
```

### Reward Templates
```
🏠 > Rewards > Templates
```

### Settings
```
🏠 > Settings
```

### Admin Users
```
🏠 > Settings > Admins
```

### Data Deletion Requests
```
🏠 > Settings > Data Requests
```

### Reports
```
🏠 > Reports
```

### Daily Reports
```
🏠 > Reports > Daily
```

### Finance
```
🏠 > Finance
```

### Expenses
```
🏠 > Finance > Expenses
```

### Audit Logs
```
🏠 > Audit Logs
```

### Order Analytics
```
🏠 > Orders > Analytics
```

### Order History (Customer View)
```
🏠 > Orders > History
```

## Interactive States

### Default State
```
🏠 > Orders > Tabs
     ↑       ↑      ↑
   link    link  current (bold, not clickable)
```

### Hover State
```
🏠 > Orders > Tabs
 ↑
(darker color on hover)
```

### Mobile View
Same layout, but may wrap on very narrow screens:
```
🏠 > Orders >
Tabs
```

## Color Scheme

- **Home Icon**: Muted foreground color
- **Separator (>)**: Muted foreground color
- **Links**: Muted foreground, darker on hover
- **Current Page**: Foreground color, bold weight

## Spacing

```
[Home Icon] [4px] [>] [4px] [Orders] [4px] [>] [4px] [Tabs]
```

Bottom margin: 24px (separates breadcrumb from page content)

## Usage in Code

The breadcrumb is automatically rendered in the dashboard layout. No additional code needed in individual pages!

```tsx
// app/dashboard/orders/tabs/page.tsx
export default function TabsPage() {
  return (
    <div>
      {/* Breadcrumb automatically appears above this content */}
      <h1>Tabs Management</h1>
      {/* ... rest of page ... */}
    </div>
  );
}
```

The breadcrumb will automatically show: 🏠 > Orders > Tabs

## Customization

To add new route mappings, edit the `labelMap` in `/components/shared/breadcrumb.tsx`:

```typescript
const labelMap: Record<string, string> = {
  // ... existing mappings ...
  'your-route': 'Your Custom Label',
};
```
