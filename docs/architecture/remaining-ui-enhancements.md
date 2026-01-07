# Remaining UI Enhancements Guide

## Overview
This document outlines the remaining UI/UX enhancements needed to complete the user profile auto-population feature.

---

## 1. Add "Save Address" Checkbox to Delivery Step

### File to Modify
`/components/features/checkout/order-details-step.tsx`

### Implementation
Add a checkbox similar to the phone save checkbox:

```typescript
// At the end of the delivery address section
<FormField
  control={form.control}
  name="saveAddress"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>
          Save this address for future orders
        </FormLabel>
        <FormDescription>
          We'll pre-fill this address next time you order delivery
        </FormDescription>
      </div>
    </FormItem>
  )}
/>
```

---

## 2. Create Address Selector Component

### File to Create
`/components/features/checkout/address-selector.tsx`

### Purpose
Allow users to select from saved addresses or add a new one during delivery checkout.

### Implementation Outline

```typescript
'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, Plus } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  isDefault: boolean;
  lastUsedAt?: Date;
}

interface AddressSelectorProps {
  form: UseFormReturn<any>;
  addresses: Address[];
  onAddNew: () => void;
}

export function AddressSelector({ form, addresses, onAddNew }: AddressSelectorProps) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Delivery Address</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Address
        </Button>
      </div>

      {addresses.length > 0 ? (
        <RadioGroup value={selectedAddressId || ''} onValueChange={setSelectedAddressId}>
          {addresses.map((address) => (
            <Card key={address.id} className="p-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value={address.id} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{address.label}</span>
                    {address.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {address.streetAddress}, {address.city}, {address.state}
                  </p>
                  {address.lastUsedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last used: {new Date(address.lastUsedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </RadioGroup>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No saved addresses</p>
          <Button type="button" variant="link" onClick={onAddNew}>
            Add your first address
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Integration Steps
1. Fetch user addresses in checkout form
2. Show address selector when delivery is selected
3. Allow toggling between "Use saved address" and "Enter new address"
4. Pre-fill form fields when saved address is selected

---

## 3. Add Visual Indicators for Pre-Filled Fields

### Files to Modify
- `/components/features/checkout/customer-info-step.tsx` (already has indicator)
- `/components/features/checkout/order-details-step.tsx`

### Implementation
Add a small icon or badge next to pre-filled fields:

```typescript
<div className="relative">
  <Input {...field} />
  {isPreFilled && (
    <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-600" />
  )}
</div>
```

---

## 4. Add "Edit" Buttons for Pre-Filled Fields

### Purpose
Allow users to easily modify pre-filled data without confusion.

### Implementation
```typescript
<div className="flex items-center gap-2">
  <Input {...field} disabled={!isEditing} />
  {isPreFilled && !isEditing && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setIsEditing(true)}
    >
      Edit
    </Button>
  )}
</div>
```

---

## 5. Improve Mobile Responsiveness

### Areas to Focus
1. **Checkout Steps Progress Bar:**
   - Make horizontal on desktop
   - Make vertical/compact on mobile
   - Use icons only on small screens

2. **Address Cards:**
   - Stack vertically on mobile
   - Show abbreviated address on mobile
   - Full address on desktop

3. **Save Checkboxes:**
   - Ensure touch-friendly size (min 44x44px)
   - Adequate spacing between elements

### Example Mobile Styles
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Responsive grid for form fields */}
</div>

<div className="flex flex-col md:flex-row gap-4">
  {/* Responsive flex layout */}
</div>
```

---

## 6. Add Loading States

### Implementation
Show skeleton loaders while fetching user data:

```typescript
{isLoadingUser ? (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
) : (
  <CustomerInfoStep form={form} isPreFilled={isPreFilled} />
)}
```

---

## 7. Add Success Feedback

### Implementation
Show toast notification when profile is updated:

```typescript
// After successful order creation
if (userId && (savePhone || saveAddress)) {
  toast({
    title: 'Profile Updated',
    description: 'Your information has been saved for future orders',
    variant: 'default',
  });
}
```

---

## Priority Order

1. **High Priority:**
   - Add "Save address" checkbox to delivery step
   - Add loading states for user data fetch
   - Mobile responsiveness improvements

2. **Medium Priority:**
   - Create address selector component
   - Add visual indicators for pre-filled fields
   - Success feedback toasts

3. **Low Priority:**
   - Edit buttons for pre-filled fields
   - Advanced address management UI
   - Profile completion tracking (if needed later)

---

## Estimated Time
- High Priority: 2-3 hours
- Medium Priority: 3-4 hours
- Low Priority: 2-3 hours
- **Total: 7-10 hours**

---

## Testing After Implementation
1. Test on mobile devices (iOS Safari, Android Chrome)
2. Test with screen readers for accessibility
3. Test with slow network (loading states)
4. Test with no saved data (empty states)
5. Test with multiple saved addresses
6. Test edit functionality
7. Test save/update flows

---

## Notes
- All UI components should use existing design system (shadcn/ui)
- Maintain consistent spacing and typography
- Follow accessibility best practices (ARIA labels, keyboard navigation)
- Ensure all interactive elements are touch-friendly (min 44x44px)
