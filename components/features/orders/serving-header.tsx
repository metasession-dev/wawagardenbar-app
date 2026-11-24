import { servingLabel, servingNameOf } from '@/lib/serving-label';

interface ServingHeaderProps {
  order: {
    orderType?: string;
    tableNumber?: string | number | null;
    servingName?: string | null;
    customer?: { name?: string | null } | null;
  };
  /** `kitchen` is the dark, large display; `dashboard` the staff card. */
  variant?: 'kitchen' | 'dashboard';
}

/**
 * @requirement REQ-KITCHEN-010 (REQ-124 AC4) — `Table N · FirstName` in large type.
 */
export function ServingHeader({ order, variant = 'dashboard' }: ServingHeaderProps) {
  const label = servingLabel({
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    name: servingNameOf(order),
  });
  return (
    <p
      data-testid="serving-header"
      className={
        variant === 'kitchen'
          ? 'text-4xl font-extrabold tracking-tight text-amber-300'
          : 'text-2xl font-bold tracking-tight'
      }
    >
      {label}
    </p>
  );
}
