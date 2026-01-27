# Daily Inventory Summary Feature - Implementation Plan

## Feature Overview

A daily inventory reconciliation system that allows staff to review and adjust inventory counts, with a super-admin approval workflow for all adjustments.

### Key Requirements

1. **Staff Interface:**
   - Access from Orders page via "Quick Actions" link
   - View all menu items (filterable by Food/Drinks)
   - Display: Item name, Today's sales count, Current inventory count
   - Input: Adjusted inventory count OR checkbox to confirm count is correct
   - Submit daily inventory snapshot

2. **Super-Admin Review:**
   - Review all submitted inventory snapshots
   - Approve/reject inventory adjustments
   - View historical snapshots (multi-day support)
   - Approval triggers actual inventory update

3. **Flexibility:**
   - Support irregular submission intervals (daily, every few days, weekly, etc.)
   - Track submission history
   - Handle multiple pending snapshots

---

## Database Schema

### 1. InventorySnapshot Model

**Purpose:** Store daily inventory counts submitted by staff

**Collection:** `inventorysnapshots`

**Schema:**
```typescript
interface IInventorySnapshot {
  _id: string;
  snapshotDate: Date; // Date this snapshot represents (not submission time)
  submittedAt: Date; // When staff submitted this
  submittedBy: string; // Staff userId
  submittedByName: string; // Staff name for display
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Date;
  reviewedBy?: string; // Super-admin userId
  reviewedByName?: string;
  reviewNotes?: string; // Optional notes from reviewer
  items: IInventorySnapshotItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface IInventorySnapshotItem {
  menuItemId: string;
  menuItemName: string;
  mainCategory: 'food' | 'drinks';
  category: string;
  
  // Snapshot data
  systemInventoryCount: number; // What system thinks inventory is
  todaySalesCount: number; // Orders sold today
  
  // Staff input
  staffConfirmed: boolean; // Did staff confirm count is correct?
  staffAdjustedCount?: number; // If not confirmed, what's the actual count?
  staffNotes?: string; // Optional notes from staff
  
  // Calculated
  discrepancy: number; // Difference between system and staff count
  requiresAdjustment: boolean; // staffConfirmed === false
}
```

**Indexes:**
- `{ snapshotDate: -1, status: 1 }` - Query by date and status
- `{ submittedBy: 1, snapshotDate: -1 }` - Staff submission history
- `{ status: 1, submittedAt: -1 }` - Pending reviews

---

## Implementation Phases

### Phase 1: Database & Services (Backend)

#### 1.1 Create InventorySnapshot Model

**File:** `/models/inventory-snapshot-model.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

const inventorySnapshotItemSchema = new Schema({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  menuItemName: { type: String, required: true },
  mainCategory: { type: String, enum: ['food', 'drinks'], required: true },
  category: { type: String, required: true },
  systemInventoryCount: { type: Number, required: true, default: 0 },
  todaySalesCount: { type: Number, required: true, default: 0 },
  staffConfirmed: { type: Boolean, required: true, default: false },
  staffAdjustedCount: { type: Number },
  staffNotes: { type: String },
  discrepancy: { type: Number, required: true, default: 0 },
  requiresAdjustment: { type: Boolean, required: true, default: false },
}, { _id: false });

const inventorySnapshotSchema = new Schema({
  snapshotDate: { type: Date, required: true },
  submittedAt: { type: Date, required: true, default: Date.now },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submittedByName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    required: true 
  },
  reviewedAt: { type: Date },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedByName: { type: String },
  reviewNotes: { type: String },
  items: [inventorySnapshotItemSchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
inventorySnapshotSchema.index({ snapshotDate: -1, status: 1 });
inventorySnapshotSchema.index({ submittedBy: 1, snapshotDate: -1 });
inventorySnapshotSchema.index({ status: 1, submittedAt: -1 });

// Prevent duplicate snapshots for same date by same user
inventorySnapshotSchema.index({ snapshotDate: 1, submittedBy: 1 }, { unique: true });

export const InventorySnapshotModel: Model<IInventorySnapshot> =
  mongoose.models.InventorySnapshot ||
  mongoose.model<IInventorySnapshot>('InventorySnapshot', inventorySnapshotSchema);
```

#### 1.2 Create InventorySnapshot Interface

**File:** `/interfaces/inventory-snapshot.interface.ts`

```typescript
export interface IInventorySnapshotItem {
  menuItemId: string;
  menuItemName: string;
  mainCategory: 'food' | 'drinks';
  category: string;
  systemInventoryCount: number;
  todaySalesCount: number;
  staffConfirmed: boolean;
  staffAdjustedCount?: number;
  staffNotes?: string;
  discrepancy: number;
  requiresAdjustment: boolean;
}

export interface IInventorySnapshot {
  _id: string;
  snapshotDate: Date;
  submittedAt: Date;
  submittedBy: string;
  submittedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  items: IInventorySnapshotItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventorySnapshotSummary {
  totalItems: number;
  confirmedItems: number;
  adjustmentItems: number;
  totalDiscrepancy: number;
}
```

#### 1.3 Create InventorySnapshotService

**File:** `/services/inventory-snapshot-service.ts`

**Key Methods:**
- `generateSnapshotData(date: Date, mainCategory?: 'food' | 'drinks')` - Generate snapshot data for staff
- `submitSnapshot(data: SubmitSnapshotData)` - Staff submits completed snapshot
- `getPendingSnapshots()` - Get all pending snapshots for review
- `getSnapshotById(id: string)` - Get specific snapshot details
- `approveSnapshot(id: string, reviewerId: string, notes?: string)` - Approve and apply adjustments
- `rejectSnapshot(id: string, reviewerId: string, notes: string)` - Reject snapshot
- `getSnapshotHistory(filters)` - Get historical snapshots with filters
- `getStaffSubmissionHistory(userId: string)` - Staff's submission history

**Key Logic:**

```typescript
// Generate snapshot data
async generateSnapshotData(date: Date, mainCategory?: 'food' | 'drinks') {
  // 1. Get all menu items with inventory tracking enabled
  const query: any = { trackInventory: true };
  if (mainCategory) query.mainCategory = mainCategory;
  
  const menuItems = await MenuItemModel.find(query)
    .populate('inventoryId')
    .sort({ name: 1 });
  
  // 2. Calculate today's sales for each item
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const salesData = await OrderModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        paymentStatus: 'paid',
        status: { $nin: ['cancelled'] }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.menuItemId',
        totalSold: { $sum: '$items.quantity' }
      }
    }
  ]);
  
  // 3. Build snapshot items
  const items = menuItems.map(item => {
    const sales = salesData.find(s => s._id.toString() === item._id.toString());
    const inventory = item.inventoryId;
    
    return {
      menuItemId: item._id.toString(),
      menuItemName: item.name,
      mainCategory: item.mainCategory,
      category: item.category,
      systemInventoryCount: inventory?.currentStock || 0,
      todaySalesCount: sales?.totalSold || 0,
      staffConfirmed: false,
      discrepancy: 0,
      requiresAdjustment: false,
    };
  });
  
  return items;
}

// Approve snapshot and apply adjustments
async approveSnapshot(id: string, reviewerId: string, reviewerName: string, notes?: string) {
  const snapshot = await InventorySnapshotModel.findById(id);
  if (!snapshot) throw new Error('Snapshot not found');
  if (snapshot.status !== 'pending') throw new Error('Snapshot already reviewed');
  
  // Apply adjustments to inventory
  for (const item of snapshot.items) {
    if (item.requiresAdjustment && item.staffAdjustedCount !== undefined) {
      const inventory = await InventoryModel.findOne({ menuItemId: item.menuItemId });
      if (inventory) {
        const oldStock = inventory.currentStock;
        const newStock = item.staffAdjustedCount;
        const difference = newStock - oldStock;
        
        // Update inventory
        inventory.currentStock = newStock;
        inventory.stockHistory.push({
          date: new Date(),
          type: difference > 0 ? 'restock' : 'adjustment',
          quantity: Math.abs(difference),
          reason: `Inventory snapshot adjustment - ${snapshot.snapshotDate.toISOString().split('T')[0]}`,
          performedBy: reviewerId,
        });
        
        if (difference < 0) {
          inventory.totalWaste += Math.abs(difference);
        } else {
          inventory.totalRestocked += difference;
        }
        
        await inventory.save();
      }
    }
  }
  
  // Update snapshot status
  snapshot.status = 'approved';
  snapshot.reviewedAt = new Date();
  snapshot.reviewedBy = reviewerId as any;
  snapshot.reviewedByName = reviewerName;
  snapshot.reviewNotes = notes;
  await snapshot.save();
  
  // Create audit log
  await AuditLogService.createLog({
    userId: reviewerId,
    userEmail: reviewerName,
    userRole: 'super-admin',
    action: 'inventory.snapshot_approved',
    resource: 'inventory-snapshot',
    resourceId: id,
    details: {
      snapshotDate: snapshot.snapshotDate,
      submittedBy: snapshot.submittedByName,
      adjustmentCount: snapshot.items.filter(i => i.requiresAdjustment).length,
    },
  });
  
  return snapshot;
}
```

#### 1.4 Create Server Actions

**File:** `/app/actions/inventory/snapshot-actions.ts`

**Actions:**
- `generateSnapshotDataAction(date: string, mainCategory?: 'food' | 'drinks')` - Staff/Admin only
- `submitSnapshotAction(data)` - Staff/Admin only
- `getPendingSnapshotsAction()` - Super-admin only
- `getSnapshotDetailsAction(id: string)` - Super-admin only
- `approveSnapshotAction(id: string, notes?: string)` - Super-admin only
- `rejectSnapshotAction(id: string, notes: string)` - Super-admin only
- `getSnapshotHistoryAction(filters)` - Super-admin only

---

### Phase 2: Staff Interface (UI)

#### 2.1 Create Inventory Summary Page

**File:** `/app/dashboard/orders/inventory-summary/page.tsx`

**Features:**
- Date selector (defaults to today)
- Category filter (All, Food, Drinks)
- Generate snapshot button
- Data table with columns:
  - Menu Item Name
  - Category
  - Today's Sales
  - Current Inventory
  - Staff Input (checkbox OR number input)
  - Notes (optional)
- Submit button
- View submission history

**Layout:**
```tsx
export default async function InventorySummaryPage() {
  // Check permissions (admin or super-admin)
  const session = await getSession();
  if (!session.role || !['admin', 'super-admin'].includes(session.role)) {
    redirect('/dashboard');
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Daily Inventory Summary</h1>
          <p className="text-muted-foreground">
            Review and adjust inventory counts
          </p>
        </div>
      </div>
      
      <InventorySummaryClient />
    </div>
  );
}
```

#### 2.2 Create Client Component

**File:** `/components/features/inventory/inventory-summary-client.tsx`

**State Management:**
- Selected date
- Selected category filter
- Snapshot data
- Form state for each item
- Loading states

**Key Features:**
```tsx
interface InventoryItemRow {
  menuItemId: string;
  menuItemName: string;
  category: string;
  todaySales: number;
  currentInventory: number;
  confirmed: boolean;
  adjustedCount?: number;
  notes?: string;
}

export function InventorySummaryClient() {
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState<'all' | 'food' | 'drinks'>('all');
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load snapshot data
  async function loadSnapshotData() {
    const result = await generateSnapshotDataAction(
      date.toISOString(),
      category === 'all' ? undefined : category
    );
    if (result.success) {
      setItems(result.data);
    }
  }
  
  // Handle checkbox toggle
  function handleConfirmToggle(itemId: string, confirmed: boolean) {
    setItems(prev => prev.map(item => 
      item.menuItemId === itemId 
        ? { ...item, confirmed, adjustedCount: confirmed ? undefined : item.adjustedCount }
        : item
    ));
  }
  
  // Handle adjusted count input
  function handleAdjustedCountChange(itemId: string, value: number) {
    setItems(prev => prev.map(item =>
      item.menuItemId === itemId
        ? { ...item, confirmed: false, adjustedCount: value }
        : item
    ));
  }
  
  // Submit snapshot
  async function handleSubmit() {
    const result = await submitSnapshotAction({
      snapshotDate: date.toISOString(),
      items: items.map(item => ({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        mainCategory: item.mainCategory,
        category: item.category,
        systemInventoryCount: item.currentInventory,
        todaySalesCount: item.todaySales,
        staffConfirmed: item.confirmed,
        staffAdjustedCount: item.adjustedCount,
        staffNotes: item.notes,
        discrepancy: item.adjustedCount 
          ? item.adjustedCount - item.currentInventory 
          : 0,
        requiresAdjustment: !item.confirmed,
      })),
    });
    
    if (result.success) {
      toast.success('Inventory snapshot submitted for review');
      router.push('/dashboard/orders');
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Date and Category Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Snapshot Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Snapshot Date</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="flex-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="food">Food Only</SelectItem>
                  <SelectItem value="drinks">Drinks Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={loadSnapshotData} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Load Inventory Data
          </Button>
        </CardContent>
      </Card>
      
      {/* Data Table */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Today's Sales</TableHead>
                  <TableHead className="text-right">Current Inventory</TableHead>
                  <TableHead className="text-center">Confirmed</TableHead>
                  <TableHead className="text-right">Adjusted Count</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.menuItemId}>
                    <TableCell className="font-medium">
                      {item.menuItemName}
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                      {item.todaySales}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.currentInventory}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.confirmed}
                        onCheckedChange={(checked) => 
                          handleConfirmToggle(item.menuItemId, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.adjustedCount ?? ''}
                        onChange={(e) => 
                          handleAdjustedCountChange(
                            item.menuItemId, 
                            parseInt(e.target.value)
                          )
                        }
                        disabled={item.confirmed}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.notes ?? ''}
                        onChange={(e) => 
                          setItems(prev => prev.map(i =>
                            i.menuItemId === item.menuItemId
                              ? { ...i, notes: e.target.value }
                              : i
                          ))
                        }
                        placeholder="Optional notes"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="mt-6 flex justify-end gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submit for Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### Phase 3: Super-Admin Review Interface

#### 3.1 Create Snapshot Review Page

**File:** `/app/dashboard/inventory/snapshots/page.tsx`

**Features:**
- List all pending snapshots
- Filter by status (Pending, Approved, Rejected)
- Filter by date range
- Filter by staff member
- Click to view details

#### 3.2 Create Snapshot Details Page

**File:** `/app/dashboard/inventory/snapshots/[id]/page.tsx`

**Features:**
- Display snapshot metadata (date, submitted by, submitted at)
- Show summary statistics
- Display all items in table
- Highlight items requiring adjustment
- Show discrepancies
- Approve/Reject buttons with notes

**Layout:**
```tsx
export default async function SnapshotDetailsPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (session.role !== 'super-admin') {
    redirect('/dashboard');
  }
  
  const result = await getSnapshotDetailsAction(params.id);
  if (!result.success) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-6">
      <SnapshotDetailsClient snapshot={result.data} />
    </div>
  );
}
```

#### 3.3 Create Review Component

**File:** `/components/features/inventory/snapshot-details-client.tsx`

**Features:**
- Snapshot header with metadata
- Summary cards (Total Items, Confirmed, Adjustments, Total Discrepancy)
- Items table with highlighting for adjustments
- Approve/Reject dialog with notes
- Action buttons

---

### Phase 4: Navigation & Access Control

#### 4.1 Add Link to Orders Page

**File:** `/app/dashboard/orders/page.tsx`

Add "Quick Actions" card with link to Inventory Summary:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Quick Actions</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <Link href="/dashboard/orders/inventory-summary">
      <Button variant="outline" className="w-full justify-start">
        <ClipboardList className="mr-2 h-4 w-4" />
        Daily Inventory Summary
      </Button>
    </Link>
    {/* Other quick actions */}
  </CardContent>
</Card>
```

#### 4.2 Add Navigation for Super-Admin

**File:** `/components/layout/dashboard-sidebar.tsx`

Add "Inventory Snapshots" link under Inventory section (super-admin only):

```tsx
{session.role === 'super-admin' && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link href="/dashboard/inventory/snapshots">
        <ClipboardCheck className="mr-2 h-4 w-4" />
        Inventory Snapshots
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

#### 4.3 Update Audit Log Actions

**File:** `/interfaces/audit-log.interface.ts`

Add new action types:
- `inventory.snapshot_submitted`
- `inventory.snapshot_approved`
- `inventory.snapshot_rejected`

---

## Implementation Checklist

### Phase 1: Backend (2-3 days)
- [ ] Create `IInventorySnapshot` interface
- [ ] Create `InventorySnapshotModel`
- [ ] Create `InventorySnapshotService` with all methods
- [ ] Create server actions in `snapshot-actions.ts`
- [ ] Add audit log action types
- [ ] Write unit tests for service methods

### Phase 2: Staff Interface (2-3 days)
- [ ] Create `/dashboard/orders/inventory-summary/page.tsx`
- [ ] Create `InventorySummaryClient` component
- [ ] Implement date picker and category filter
- [ ] Build data table with checkbox/input logic
- [ ] Implement submit functionality
- [ ] Add loading and error states
- [ ] Test submission flow

### Phase 3: Super-Admin Review (2-3 days)
- [ ] Create `/dashboard/inventory/snapshots/page.tsx`
- [ ] Create snapshots list component with filters
- [ ] Create `/dashboard/inventory/snapshots/[id]/page.tsx`
- [ ] Create `SnapshotDetailsClient` component
- [ ] Implement approve/reject dialogs
- [ ] Add summary statistics
- [ ] Test approval workflow and inventory updates

### Phase 4: Integration (1 day)
- [ ] Add link to Orders page
- [ ] Add navigation to sidebar (super-admin)
- [ ] Update access control middleware
- [ ] Test role-based permissions
- [ ] Add toast notifications
- [ ] Update documentation

### Phase 5: Testing & Polish (1-2 days)
- [ ] Test complete workflow (staff submit → admin approve)
- [ ] Test edge cases (duplicate submissions, invalid data)
- [ ] Test multi-day scenarios
- [ ] Verify inventory updates are correct
- [ ] Test audit logging
- [ ] Mobile responsiveness
- [ ] Add helpful empty states and loading indicators

---

## Technical Considerations

### 1. Duplicate Submission Prevention
- Unique index on `{ snapshotDate, submittedBy }` prevents duplicate submissions
- UI should check for existing submission before allowing new one

### 2. Date Handling
- All dates stored in UTC
- Display in user's local timezone
- Snapshot date is the business date, not submission timestamp

### 3. Performance
- Pagination for snapshot list (50 per page)
- Index on common query patterns
- Aggregate queries for sales data cached for 5 minutes

### 4. Data Integrity
- Transaction support for approval process
- Rollback mechanism if inventory update fails
- Audit trail for all changes

### 5. Validation
- Staff cannot submit snapshot for future dates
- Adjusted count must be >= 0
- At least one item must be processed
- Super-admin cannot approve their own submissions

---

## Future Enhancements

1. **Automated Reminders:** Email/notification to staff if no snapshot submitted by end of day
2. **Batch Operations:** Approve multiple snapshots at once
3. **Analytics Dashboard:** Trends in discrepancies, most adjusted items
4. **Mobile App:** Dedicated mobile interface for quick inventory checks
5. **Photo Evidence:** Allow staff to attach photos of physical counts
6. **Barcode Scanning:** Quick inventory counting via barcode scanner
7. **Predictive Alerts:** Flag unusual discrepancies automatically
8. **Export Reports:** CSV/PDF export of snapshot history

---

## Estimated Timeline

- **Total Development Time:** 8-10 days
- **Testing & QA:** 2-3 days
- **Documentation:** 1 day
- **Total:** ~2 weeks

## Dependencies

- Existing Inventory Management system
- Order Management system (for sales data)
- User authentication and roles
- Audit logging system

---

## Success Metrics

1. Staff can complete daily inventory in < 10 minutes
2. Super-admin can review and approve snapshots in < 5 minutes
3. Inventory accuracy improves by 20%+ within first month
4. 90%+ of snapshots submitted within 24 hours
5. Zero data loss or corruption during approval process
