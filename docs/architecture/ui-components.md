# UI Components Documentation

## ✅ Completed: Feature 1.4 - Base UI Components

**Status:** Complete  
**Date:** November 14, 2025

---

## Overview

Implemented a comprehensive set of reusable UI components following mobile-first design principles with Tailwind CSS and Shadcn UI. All components are fully typed with TypeScript and integrate seamlessly with React Hook Form.

---

## Installed Shadcn Components

### Core Components
- ✅ `button` - Button component with variants
- ✅ `form` - Form wrapper with context
- ✅ `input` - Text input component
- ✅ `card` - Card container component
- ✅ `dialog` - Modal dialog component
- ✅ `toast` - Toast notification system
- ✅ `label` - Form label component
- ✅ `tabs` - Tabbed interface component
- ✅ `select` - Select dropdown component
- ✅ `dropdown-menu` - Dropdown menu component
- ✅ `separator` - Visual separator line
- ✅ `skeleton` - Loading skeleton component
- ✅ `badge` - Badge/tag component
- ✅ `avatar` - User avatar component
- ✅ `sheet` - Slide-out panel (mobile menu)
- ✅ `textarea` - Multi-line text input

**Total:** 16 Shadcn components installed

---

## Custom Components Created

### 1. Navigation Components

#### **Navbar** (`/components/shared/navigation/navbar.tsx`)

Responsive navigation bar with mobile menu support.

**Features:**
- Mobile-first responsive design
- Hamburger menu for mobile (Sheet component)
- User authentication state integration
- Shopping cart indicator with badge
- Dropdown menu for user actions
- Active link highlighting
- Guest user support

**Usage:**
```typescript
import { Navbar } from '@/components/shared/navigation';

<Navbar />
```

**Mobile Breakpoints:**
- Mobile: < 768px (hamburger menu)
- Desktop: ≥ 768px (full navigation)

#### **Footer** (`/components/shared/navigation/footer.tsx`)

Comprehensive footer with links and social media.

**Features:**
- 4-column layout (responsive)
- Company, Support, and Quick Links sections
- Social media icons
- Copyright information
- Mobile-responsive (stacks on small screens)

**Usage:**
```typescript
import { Footer } from '@/components/shared/navigation';

<Footer />
```

---

### 2. Loading Skeletons

#### **MenuItemSkeleton** (`/components/shared/skeletons/menu-item-skeleton.tsx`)

Loading placeholder for menu items.

**Features:**
- Card-based skeleton
- Image, title, description, and button placeholders
- Grid layout support

**Usage:**
```typescript
import { MenuItemSkeleton, MenuItemListSkeleton } from '@/components/shared/skeletons';

// Single skeleton
<MenuItemSkeleton />

// Multiple skeletons in grid
<MenuItemListSkeleton count={6} />
```

#### **OrderSkeleton** (`/components/shared/skeletons/order-skeleton.tsx`)

Loading placeholder for orders.

**Features:**
- Order card layout
- Header, content, and footer sections
- List layout support

**Usage:**
```typescript
import { OrderSkeleton, OrderListSkeleton } from '@/components/shared/skeletons';

// Single skeleton
<OrderSkeleton />

// Multiple skeletons
<OrderListSkeleton count={3} />
```

#### **PageSkeleton** (`/components/shared/skeletons/page-skeleton.tsx`)

Loading placeholders for full pages and tables.

**Components:**
- `PageHeaderSkeleton` - Page title and description
- `PageSkeleton` - Full page layout
- `TableSkeleton` - Table with rows

**Usage:**
```typescript
import { PageHeaderSkeleton, PageSkeleton, TableSkeleton } from '@/components/shared/skeletons';

<PageSkeleton />
<TableSkeleton rows={5} />
```

---

### 3. Error Handling Components

#### **ErrorBoundary** (`/components/shared/errors/error-boundary.tsx`)

React Error Boundary for catching component errors.

**Features:**
- Catches JavaScript errors in child components
- Custom fallback UI
- Try again functionality
- Development mode error display

**Usage:**
```typescript
import { ErrorBoundary } from '@/components/shared/errors';

<ErrorBoundary fallback={<CustomError />}>
  <YourComponent />
</ErrorBoundary>
```

#### **ErrorState** (`/components/shared/errors/error-state.tsx`)

Reusable error display components.

**Components:**
- `ErrorState` - Full-page error display
- `InlineErrorState` - Inline error banner

**Usage:**
```typescript
import { ErrorState, InlineErrorState } from '@/components/shared/errors';

// Full page error
<ErrorState
  title="Failed to Load"
  message="Unable to fetch data"
  onRetry={() => refetch()}
/>

// Inline error
<InlineErrorState
  message="Failed to load items"
  onRetry={() => refetch()}
/>
```

#### **NotFoundState** (`/components/shared/errors/not-found-state.tsx`)

404/Not Found display component.

**Usage:**
```typescript
import { NotFoundState } from '@/components/shared/errors';

<NotFoundState
  title="Order Not Found"
  message="The order you're looking for doesn't exist"
  backLink="/orders"
  backLabel="View Orders"
/>
```

---

### 4. Form Components

All form components integrate with React Hook Form and support validation error display.

#### **FormFieldWrapper** (`/components/shared/forms/form-field-wrapper.tsx`)

Base wrapper for form fields with label, error, and description.

**Features:**
- Label with required indicator
- Error message display
- Optional description text
- Consistent spacing

#### **TextField** (`/components/shared/forms/text-field.tsx`)

Text input field with label and validation.

**Usage:**
```typescript
import { TextField } from '@/components/shared/forms';
import { useForm } from 'react-hook-form';

const { register, formState: { errors } } = useForm();

<TextField
  label="Email Address"
  type="email"
  placeholder="your@email.com"
  error={errors.email?.message}
  required
  {...register('email')}
/>
```

#### **SelectField** (`/components/shared/forms/select-field.tsx`)

Select dropdown with label and validation.

**Usage:**
```typescript
import { SelectField } from '@/components/shared/forms';

<SelectField
  label="Order Type"
  options={[
    { value: 'dine-in', label: 'Dine In' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'delivery', label: 'Delivery' },
  ]}
  placeholder="Select order type"
  error={errors.orderType?.message}
  required
  value={orderType}
  onValueChange={setOrderType}
/>
```

#### **TextareaField** (`/components/shared/forms/textarea-field.tsx`)

Multi-line text input with label and validation.

**Usage:**
```typescript
import { TextareaField } from '@/components/shared/forms';

<TextareaField
  label="Special Instructions"
  placeholder="Any dietary requirements or preferences..."
  rows={4}
  error={errors.instructions?.message}
  {...register('instructions')}
/>
```

#### **SubmitButton** (`/components/shared/forms/submit-button.tsx`)

Submit button with loading state.

**Usage:**
```typescript
import { SubmitButton } from '@/components/shared/forms';

<SubmitButton isLoading={isSubmitting} loadingText="Submitting...">
  Submit Order
</SubmitButton>
```

---

### 5. Utility Components

#### **EmptyState** (`/components/shared/ui/empty-state.tsx`)

Display for empty lists or no data states.

**Usage:**
```typescript
import { EmptyState } from '@/components/shared/ui';
import { ShoppingCart } from 'lucide-react';

<EmptyState
  icon={ShoppingCart}
  title="Your cart is empty"
  description="Add items from the menu to get started"
  action={{
    label: 'Browse Menu',
    onClick: () => router.push('/menu'),
  }}
/>
```

#### **PageHeader** (`/components/shared/ui/page-header.tsx`)

Consistent page header with title, description, and actions.

**Usage:**
```typescript
import { PageHeader } from '@/components/shared/ui';
import { Button } from '@/components/ui/button';

<PageHeader
  title="My Orders"
  description="View and track your order history"
  actions={
    <Button>New Order</Button>
  }
/>
```

#### **LoadingButton** (`/components/shared/ui/loading-button.tsx`)

Button with loading spinner.

**Usage:**
```typescript
import { LoadingButton } from '@/components/shared/ui';

<LoadingButton isLoading={isLoading} onClick={handleClick}>
  Load More
</LoadingButton>
```

---

### 6. Layout Components

#### **MainLayout** (`/components/shared/layout/main-layout.tsx`)

Main application layout with navbar and footer.

**Usage:**
```typescript
import { MainLayout } from '@/components/shared/layout';

<MainLayout showFooter={true}>
  <YourPageContent />
</MainLayout>
```

#### **Container** (`/components/shared/layout/container.tsx`)

Responsive container with max-width control.

**Sizes:**
- `sm` - max-w-3xl
- `md` - max-w-5xl
- `lg` - max-w-7xl (default)
- `xl` - max-w-[1400px]
- `full` - max-w-full

**Usage:**
```typescript
import { Container } from '@/components/shared/layout';

<Container size="md" className="py-8">
  <YourContent />
</Container>
```

---

## Component Organization

```
components/
├── ui/                          # Shadcn UI components
│   ├── button.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── toast.tsx
│   ├── toaster.tsx
│   ├── label.tsx
│   ├── tabs.tsx
│   ├── select.tsx
│   ├── dropdown-menu.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── sheet.tsx
│   └── textarea.tsx
│
└── shared/                      # Custom components
    ├── navigation/
    │   ├── navbar.tsx          # Main navigation
    │   ├── footer.tsx          # Footer
    │   └── index.ts
    │
    ├── skeletons/
    │   ├── menu-item-skeleton.tsx
    │   ├── order-skeleton.tsx
    │   ├── page-skeleton.tsx
    │   └── index.ts
    │
    ├── errors/
    │   ├── error-boundary.tsx
    │   ├── error-state.tsx
    │   ├── not-found-state.tsx
    │   └── index.ts
    │
    ├── forms/
    │   ├── form-field-wrapper.tsx
    │   ├── text-field.tsx
    │   ├── select-field.tsx
    │   ├── textarea-field.tsx
    │   ├── submit-button.tsx
    │   └── index.ts
    │
    ├── ui/
    │   ├── empty-state.tsx
    │   ├── page-header.tsx
    │   ├── loading-button.tsx
    │   └── index.ts
    │
    ├── layout/
    │   ├── main-layout.tsx
    │   ├── container.tsx
    │   └── index.ts
    │
    ├── auth/                    # From Feature 1.3
    │   ├── login-form.tsx
    │   ├── guest-checkout-form.tsx
    │   └── auth-dialog.tsx
    │
    └── providers.tsx            # TanStack Query provider
```

---

## Mobile-First Design Principles

All components follow mobile-first approach:

### Breakpoints (Tailwind)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Best Practices Applied
1. **Base styles for mobile** - Default styles target mobile devices
2. **Progressive enhancement** - Add complexity for larger screens
3. **Touch-friendly** - Minimum 44x44px touch targets
4. **Readable text** - Minimum 16px font size
5. **Flexible layouts** - Use flexbox and grid
6. **Responsive images** - Use Next.js Image component
7. **Stack on mobile** - Horizontal layouts become vertical

### Example Pattern
```typescript
// Mobile first: vertical stack
<div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

---

## Integration with React Hook Form

### Complete Form Example

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, SelectField, TextareaField, SubmitButton } from '@/components/shared/forms';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  orderType: z.enum(['dine-in', 'pickup', 'delivery']),
  instructions: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function OrderForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const orderType = watch('orderType');

  async function onSubmit(data: FormData) {
    // Handle submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <TextField
        label="Name"
        placeholder="Your name"
        error={errors.name?.message}
        required
        {...register('name')}
      />

      <SelectField
        label="Order Type"
        options={[
          { value: 'dine-in', label: 'Dine In' },
          { value: 'pickup', label: 'Pickup' },
          { value: 'delivery', label: 'Delivery' },
        ]}
        error={errors.orderType?.message}
        required
        value={orderType}
        onValueChange={(value) => setValue('orderType', value as any)}
      />

      <TextareaField
        label="Special Instructions"
        placeholder="Any dietary requirements..."
        error={errors.instructions?.message}
        {...register('instructions')}
      />

      <SubmitButton isLoading={isSubmitting}>
        Place Order
      </SubmitButton>
    </form>
  );
}
```

---

## Toast Notification System

The toast system is already configured in the Providers component.

### Usage

```typescript
'use client';

import { useToast } from '@/hooks/use-toast';

export function MyComponent() {
  const { toast } = useToast();

  function showSuccess() {
    toast({
      title: 'Success',
      description: 'Your order has been placed!',
    });
  }

  function showError() {
    toast({
      title: 'Error',
      description: 'Failed to place order',
      variant: 'destructive',
    });
  }

  return (
    <div>
      <button onClick={showSuccess}>Success Toast</button>
      <button onClick={showError}>Error Toast</button>
    </div>
  );
}
```

---

## Accessibility Features

All components follow accessibility best practices:

- ✅ **Semantic HTML** - Proper use of semantic elements
- ✅ **ARIA labels** - Screen reader support
- ✅ **Keyboard navigation** - Full keyboard support
- ✅ **Focus management** - Visible focus indicators
- ✅ **Color contrast** - WCAG AA compliant
- ✅ **Touch targets** - Minimum 44x44px
- ✅ **Form labels** - Associated with inputs
- ✅ **Error messages** - Announced to screen readers

---

## Performance Optimizations

- ✅ **Code splitting** - Components lazy loaded when needed
- ✅ **Tree shaking** - Unused code removed
- ✅ **Minimal re-renders** - Optimized with React.memo where needed
- ✅ **CSS-in-JS avoided** - Using Tailwind for performance
- ✅ **Image optimization** - Next.js Image component ready

---

## Next Steps

### Immediate Usage
1. Use `MainLayout` in page components
2. Implement loading states with skeletons
3. Add error boundaries to route segments
4. Use form components for all forms

### Future Enhancements
1. Add more specialized skeletons (profile, dashboard)
2. Create data table component
3. Add pagination component
4. Create breadcrumb component
5. Add command palette (⌘K menu)
6. Create notification center
7. Add theme switcher (dark mode)

---

*Implementation completed: November 14, 2025*
