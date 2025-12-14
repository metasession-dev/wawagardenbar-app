# Inventory Report Feature

## Overview
The Inventory Report provides a comprehensive view of stock levels, usage patterns, and reorder recommendations for all tracked inventory items.

## Access
- **URL**: `/dashboard/reports/inventory`
- **Permissions**: Super-admin and Admin roles only
- **Navigation**: Dashboard → Reports → Inventory Report

## Features

### 1. Real-Time Statistics Dashboard
Four key metrics displayed at the top:
- **Total Items**: Total number of tracked inventory items
- **In Stock**: Number of items with adequate stock levels
- **Low Stock**: Number of items needing attention
- **Total Value**: Current monetary value of all inventory (₦)

### 2. Status Filters
Quick filter buttons to view:
- **All**: All inventory items
- **In Stock**: Items with stock above minimum threshold
- **Low Stock**: Items below minimum threshold
- **Out of Stock**: Items with zero stock

### 3. Detailed Inventory Table
Comprehensive table showing:
- **Item Name**: Menu item name
- **Current Stock**: Current quantity with unit
- **Min/Max**: Minimum and maximum stock thresholds
- **Status**: Visual badge (In Stock/Low Stock/Out of Stock)
- **Stock Level**: Visual progress bar showing percentage
- **Cost/Unit**: Cost per unit (₦)
- **Total Value**: Current stock value (₦)
- **Supplier**: Supplier name or N/A

### 4. Visual Stock Indicators
Color-coded progress bars:
- 🟢 **Green** (>50%): Healthy stock level
- 🟡 **Yellow** (20-50%): Moderate stock level
- 🔴 **Red** (<20%): Critical stock level

### 5. Export Functionality
- **CSV Export**: Download complete inventory report
- **Filename Format**: `inventory-report-YYYY-MM-DD.csv`
- **Includes**: All visible columns with current filter applied

### 6. Refresh Capability
- Manual refresh button to reload latest data
- Loading state with spinning icon
- Real-time data from database

## Technical Implementation

### Files Created

#### 1. Page Component
**File**: `/app/dashboard/reports/inventory/page.tsx`
- Server component with authentication/authorization
- Session validation
- Redirects for unauthorized access

#### 2. Client Component
**File**: `/app/dashboard/reports/inventory/inventory-report-client.tsx`
- React client component with state management
- Fetches data from API
- Handles filtering, export, and UI rendering
- Responsive design with Tailwind CSS

#### 3. API Route
**File**: `/app/api/reports/inventory/route.ts`
- GET endpoint for inventory data
- Authentication and authorization checks
- Fetches all inventory items from MongoDB
- Calculates real-time statistics
- Returns JSON response with items and stats

### Data Flow

```
User → Page Component (Auth Check)
     → Client Component (UI)
     → API Route (/api/reports/inventory)
     → MongoDB (InventoryModel)
     → Response (items + stats)
     → Client Component (Render)
```

### Database Query

```typescript
// Fetch all inventory items sorted by status and name
const items = await InventoryModel.find()
  .sort({ status: 1, menuItemName: 1 })
  .lean();
```

### Statistics Calculation

```typescript
const stats = {
  totalItems: items.length,
  inStock: items.filter(item => item.status === 'in-stock').length,
  lowStock: items.filter(item => item.status === 'low-stock').length,
  outOfStock: items.filter(item => item.status === 'out-of-stock').length,
  totalValue: items.reduce((sum, item) => 
    sum + (item.currentStock * item.costPerUnit), 0
  ),
  needsReorder: items.filter(item => 
    item.status === 'low-stock' || item.status === 'out-of-stock'
  ).length,
};
```

## Usage Instructions

### For Administrators

1. **Access the Report**
   - Navigate to Dashboard → Reports
   - Click "Inventory Report" card

2. **View Statistics**
   - Review the four metric cards at the top
   - Identify items needing attention (Low Stock count)

3. **Filter Items**
   - Click filter buttons to view specific status groups
   - Use "Low Stock" filter to see items needing reorder

4. **Analyze Stock Levels**
   - Review the progress bars for visual stock indicators
   - Check items with red bars (critical stock)
   - Verify supplier information for reordering

5. **Export Data**
   - Click "Export CSV" to download report
   - Use exported data for purchasing decisions
   - Share with suppliers or management

6. **Refresh Data**
   - Click "Refresh" button to reload latest data
   - Useful after updating inventory levels

### For Inventory Management

**Daily Tasks:**
- Check Low Stock items count
- Review items with red progress bars
- Plan reorders based on supplier information

**Weekly Tasks:**
- Export full inventory report
- Analyze total inventory value trends
- Review supplier performance

**Monthly Tasks:**
- Compare inventory values month-over-month
- Identify slow-moving items
- Optimize stock levels (min/max thresholds)

## Status Definitions

### In Stock
- Current stock ≥ minimum stock threshold
- Status badge: 🟢 Green
- Action: Monitor regularly

### Low Stock
- Current stock < minimum stock threshold
- Current stock > 0
- Status badge: 🟡 Yellow
- Action: Reorder soon

### Out of Stock
- Current stock = 0
- Status badge: 🔴 Red
- Action: Reorder immediately

## CSV Export Format

```csv
Item Name,Current Stock,Min Stock,Max Stock,Unit,Status,Cost/Unit,Total Value,Supplier
Star Lager Beer,45,20,100,bottles,in-stock,₦500,₦22500,Nigerian Breweries
Heineken,8,15,80,bottles,low-stock,₦700,₦5600,Heineken Nigeria
...
```

## Performance Considerations

- **Database Query**: Single query fetches all items (~50-200ms)
- **Statistics Calculation**: Client-side filtering and calculations
- **Pagination**: Not implemented (suitable for <1000 items)
- **Caching**: No caching (always fresh data on refresh)

## Future Enhancements

### Planned Features
1. **Date Range Analysis**: View stock changes over time
2. **Usage Trends**: Track consumption patterns
3. **Automatic Reorder Suggestions**: AI-based reorder recommendations
4. **Supplier Integration**: Direct reorder via email/API
5. **Stock Movement History**: Track all stock changes
6. **Waste Tracking**: Record expired/damaged items
7. **Cost Analysis**: Track cost trends per item
8. **Alerts**: Email/SMS notifications for low stock

### Potential Improvements
1. **Pagination**: For large inventories (>500 items)
2. **Search**: Text search for item names
3. **Category Filtering**: Filter by menu category
4. **Sorting**: Sort by any column
5. **PDF Export**: Generate formatted PDF reports
6. **Charts**: Visual charts for stock distribution
7. **Comparison**: Compare periods (week-over-week)
8. **Forecasting**: Predict when items will run out

## Related Features

- **Inventory Management** (`/dashboard/inventory`): Edit stock levels
- **Menu Management** (`/dashboard/menu`): Link menu items to inventory
- **Daily Report** (`/dashboard/reports/daily`): Financial overview

## Troubleshooting

### Report Not Loading
- Check authentication (logged in as admin/super-admin)
- Verify MongoDB connection
- Check browser console for errors
- Try refreshing the page

### Empty Report
- Click "Refresh" button to load data
- Verify inventory items exist in database
- Check that items have inventory tracking enabled

### Export Not Working
- Ensure items are loaded (click Refresh first)
- Check browser download settings
- Try a different browser

### Incorrect Statistics
- Click "Refresh" to reload latest data
- Verify inventory status updates in Inventory Management
- Check that stock levels are correctly set

## Security

- ✅ Authentication required (session-based)
- ✅ Authorization check (admin/super-admin only)
- ✅ No sensitive data exposure
- ✅ Read-only operations (no data modification)
- ✅ CSRF protection via Next.js

## Testing Checklist

- [ ] Page loads without errors
- [ ] Statistics display correctly
- [ ] All filters work properly
- [ ] Table displays all inventory items
- [ ] Progress bars show correct percentages
- [ ] Status badges show correct colors
- [ ] Export CSV downloads successfully
- [ ] Refresh button reloads data
- [ ] Responsive design works on mobile
- [ ] Unauthorized users are redirected

## Deployment Notes

- No database migrations required
- No environment variables needed
- Compatible with existing inventory system
- Works with current MongoDB schema
- No additional dependencies

## Support

For issues or questions:
1. Check this documentation
2. Review related inventory documentation
3. Check application logs
4. Contact development team
