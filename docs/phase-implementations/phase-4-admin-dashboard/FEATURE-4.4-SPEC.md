# Feature 4.4: Rewards Management Dashboard - Implementation Specification

**Priority:** P1 - Critical  
**Dependencies:** Feature 3.2 (Random Rewards System)  
**Estimated Time:** 15 hours  
**Status:** Not Started

---

## 📋 Overview

### Purpose
Create a comprehensive admin dashboard for managing the rewards system, allowing admins to create, configure, and track reward rules and issued rewards without requiring direct database access.

### Scope
- Reward rules CRUD operations
- Analytics and statistics dashboard
- Issued rewards tracking and management
- Pre-configured templates for quick setup
- Export and reporting capabilities

---

## 🎯 Features Breakdown

### 1. Reward Rules Management (`/dashboard/rewards/rules`)

#### 1.1 Rules List Page

**Components:**
- Page header with "Create Rule" button
- Filters: status, reward type, date range
- Search bar (by rule name)
- Data table with sortable columns
- Bulk actions toolbar
- Pagination controls

**Table Columns:**
- Name
- Type (badge with icon)
- Spend Threshold (₦)
- Reward Value
- Probability (%)
- Status (Active/Inactive toggle)
- Actions (Edit, Duplicate, Delete)

**Features:**
- ✅ Sort by any column
- ✅ Filter by status/type
- ✅ Search by name
- ✅ Bulk activate/deactivate
- ✅ Quick toggle status
- ✅ Duplicate rule
- ✅ Delete with confirmation

---

#### 1.2 Create/Edit Rule Form

**Form Sections:**

1. **Basic Information**
   - Name (required, 3-100 chars)
   - Description (required, 10-500 chars)
   - Active status toggle

2. **Spend Threshold**
   - Minimum spend amount (₦)

3. **Reward Configuration**
   - Reward type selector (visual cards)
   - Reward value (validation based on type)
   - Free item selector (if type = free-item)

4. **Probability & Limits**
   - Probability slider (0-100%)
   - Max redemptions per user (optional)
   - Validity days

5. **Campaign Schedule** (Optional)
   - Start date
   - End date

**Reward Types:**
- Discount Percentage (1-100%)
- Fixed Discount (₦100-50,000)
- Free Item (menu item selector)
- Loyalty Points (100-10,000 points)

---

### 2. Analytics Dashboard (`/dashboard/rewards`)

#### 2.1 Statistics Cards (3x2 Grid)

1. **Active Rules** - Count of active rules
2. **Rewards Issued** - All time count with trend
3. **Rewards Redeemed** - Successfully used count
4. **Redemption Rate** - Percentage (redeemed/issued)
5. **Total Value Redeemed** - ₦ discount value given
6. **Active Rewards** - Valid, unredeemed count

#### 2.2 Charts

1. **Rewards Issued Over Time** (Line Chart)
   - Last 30 days
   - Two lines: issued, redeemed
   - Date range selector

2. **Rewards by Type** (Pie Chart)
   - Distribution by reward type
   - Color-coded segments

3. **Redemption Rate by Rule** (Bar Chart)
   - Top 10 rules
   - Color gradient by rate
   - Horizontal bars

#### 2.3 Top Performing Rules Table

**Columns:**
- Rank, Rule Name, Times Issued, Times Redeemed, Rate (%), Total Value (₦)

---

### 3. Issued Rewards Tracking (`/dashboard/rewards/issued`)

#### 3.1 Issued Rewards Table

**Columns:**
- Reward Code
- User Email
- Reward Type
- Reward Value
- Status (badge)
- Issued Date
- Expires Date
- Redeemed Date
- Earned From Order
- Used In Order
- Actions

**Filters:**
- Status (active/redeemed/expired)
- Reward type
- Date range
- Search (email or code)

**Features:**
- ✅ Pagination (50 per page)
- ✅ Export to CSV
- ✅ Manual expire action
- ✅ View details modal

---

### 4. Rule Templates (`/dashboard/rewards/templates`)

**Pre-configured Templates:**

1. **First Order 10% Off**
   - ₦0 threshold, 10%, 100% probability

2. **High Spender ₦500 Off**
   - ₦5,000 threshold, ₦500 off, 50% probability

3. **Loyalty Points Bonus**
   - ₦3,000 threshold, 500 points, 30% probability

4. **Free Dessert**
   - ₦4,000 threshold, free item, 20% probability

5. **Weekend 15% Off**
   - ₦2,000 threshold, 15%, 40% probability

**Features:**
- Visual template cards
- One-click application
- Customize before saving

---

## 🔧 Technical Implementation

### Server Actions

**File:** `/app/actions/admin/reward-rules-actions.ts`
```typescript
- createRewardRuleAction(data)
- updateRewardRuleAction(id, data)
- deleteRewardRuleAction(id)
- toggleRewardRuleStatusAction(id)
- getRewardRulesAction(filters, page, limit)
- getRewardRuleByIdAction(id)
- duplicateRewardRuleAction(id)
- bulkUpdateRewardRulesAction(ids, action)
```

**File:** `/app/actions/admin/reward-analytics-actions.ts`
```typescript
- getRewardStatisticsAction()
- getRewardsIssuedOverTimeAction(days)
- getRewardsByTypeAction()
- getTopPerformingRulesAction(limit)
- getRedemptionRateByRuleAction()
```

**File:** `/app/actions/admin/issued-rewards-actions.ts`
```typescript
- getIssuedRewardsAction(filters, page, limit)
- getRewardDetailsAction(rewardId)
- expireRewardAction(rewardId)
- exportIssuedRewardsAction(filters)
```

---

### Components Structure

```
/components/features/admin/rewards/
├── reward-rule-form.tsx
├── reward-rule-table.tsx
├── reward-rule-filters.tsx
├── reward-stats-cards.tsx
├── reward-charts.tsx
├── issued-rewards-table.tsx
├── issued-rewards-filters.tsx
├── reward-details-modal.tsx
├── reward-templates.tsx
├── reward-type-selector.tsx
├── probability-slider.tsx
└── index.ts
```

---

### Validation (Zod)

```typescript
export const createRewardRuleSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  isActive: z.boolean().default(true),
  spendThreshold: z.number().min(0),
  rewardType: z.enum(['discount-percentage', 'discount-fixed', 'free-item', 'loyalty-points']),
  rewardValue: z.number().positive(),
  freeItemId: z.string().optional(),
  probability: z.number().min(0).max(1),
  maxRedemptionsPerUser: z.number().int().positive().optional(),
  validityDays: z.number().int().positive(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});
```

---

### New RewardsService Methods

```typescript
// Add to existing RewardsService

static async getRewardsIssuedOverTime(days: number) {
  // Aggregate rewards by day
}

static async getRewardsByType() {
  // Count rewards by type
}

static async getTopPerformingRules(limit: number = 10) {
  // Calculate redemption rates
}
```

---

## 🎨 UI/UX Guidelines

### Design System
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)

### Responsive Layout
- Mobile: Single column
- Tablet: 2 columns for stats
- Desktop: 3 columns for stats, full-width tables

### Accessibility
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast ≥ 4.5:1

---

## 🧪 Testing Strategy

### Unit Tests
- Form validation
- Component rendering
- Server action logic
- CSV export format

### Integration Tests
- Create rule flow
- Edit rule flow
- Delete rule flow
- Export rewards flow

### E2E Tests
- Complete CRUD operations
- Analytics display
- Filter and search
- Template application

---

## 📊 Performance Optimization

### Database
- Index on `isActive`, `spendThreshold`, `createdAt`
- Use `.lean()` for read-only queries
- Implement pagination
- Cache analytics data

### Frontend
- Server-side rendering
- Lazy load charts
- Debounce search (300ms)
- Memoize calculations
- Code splitting

---

## 🚀 Implementation Phases

### Phase 1: Core CRUD (5 hours)
- [ ] Create reward rule form
- [ ] Build rules table
- [ ] Implement server actions
- [ ] Add validation
- [ ] Create pages

### Phase 2: Analytics (4 hours)
- [ ] Statistics cards
- [ ] Charts components
- [ ] Analytics server actions
- [ ] Dashboard page

### Phase 3: Issued Rewards (3 hours)
- [ ] Issued rewards table
- [ ] Filters component
- [ ] Export functionality
- [ ] Details modal

### Phase 4: Templates (2 hours)
- [ ] Template cards
- [ ] Template application
- [ ] Templates page

### Phase 5: Testing & Polish (1 hour)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Bug fixes
- [ ] Documentation

**Total: 15 hours**

---

## ✅ Acceptance Criteria

Feature 4.4 is complete when:

1. ✅ Admin can create reward rules via UI
2. ✅ Admin can edit existing rules
3. ✅ Admin can delete rules with confirmation
4. ✅ Admin can toggle active/inactive status
5. ✅ Admin can view reward statistics
6. ✅ Admin can see analytics charts
7. ✅ Admin can track issued rewards
8. ✅ Admin can filter and search rewards
9. ✅ Admin can export reward data to CSV
10. ✅ Admin can use templates for quick setup
11. ✅ All operations are admin-only (secure)
12. ✅ UI is responsive (mobile, tablet, desktop)
13. ✅ All forms have proper validation
14. ✅ Error handling is comprehensive
15. ✅ Documentation is complete

---

## 📚 Related Documentation

- `/docs/Phase 3: Order Management & Tracking/FEATURE-3.2-COMPLETE.md`
- `/docs/Phase 3: Order Management & Tracking/REWARDS-ADMIN-GAP-ANALYSIS.md`
- `/docs/Phase 4: Admin Dashboard/DOCUMENTATION-UPDATES-REWARDS.md`
- `/docs/requirements.md` (Lines 56-90)
- `/docs/deliverables-strategy.md` (Lines 327-356)

---

*Specification created: November 17, 2025*
