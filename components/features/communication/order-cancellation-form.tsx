'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cancelOrderWithRefundAction } from '@/app/actions/communication/communication-actions';
import { useRouter } from 'next/navigation';

const cancellationSchema = z.object({
  reason: z
    .string()
    .min(10, 'Please provide a reason (at least 10 characters)'),
});

type CancellationFormData = z.infer<typeof cancellationSchema>;

interface OrderCancellationFormProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  orderTotal: number;
}

/**
 * Order cancellation form with refund logic
 * Automatic full refund before preparation; a refund request after it (REQ-128)
 */
export function OrderCancellationForm({
  orderId,
  orderNumber,
  orderStatus,
  orderTotal,
}: OrderCancellationFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<CancellationFormData>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: {
      reason: '',
    },
  });

  // REQ-128 — before preparation the refund is automatic and full; after it,
  // the request goes to a manager. There is no partial rule for customers.
  const beforePreparation =
    orderStatus === 'pending' || orderStatus === 'confirmed';

  function getRefundMessage(): string {
    if (beforePreparation) {
      return `Your order will be cancelled and you will get a full refund of ₦${orderTotal.toLocaleString()} to your original payment method.`;
    }
    return 'Your order is already being prepared. We will pass your request to our manager, who decides whether to refund it. No money moves until they approve.';
  }

  async function onSubmit(data: CancellationFormData) {
    try {
      setLoading(true);

      const result = await cancelOrderWithRefundAction({
        orderId,
        reason: data.reason,
      });

      if (result.success) {
        toast({
          title: 'Order Cancelled',
          description: result.message,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Check if order can be cancelled
  const canCancel = !['delivered', 'completed', 'cancelled'].includes(
    orderStatus
  );

  if (!canCancel) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          Cancel Order
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Order
          </DialogTitle>
          <DialogDescription>
            Order #{orderNumber} - Are you sure you want to cancel this order?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-4 my-4">
          <p className="text-sm font-medium mb-2">Refund Information:</p>
          <p className="text-sm text-muted-foreground">{getRefundMessage()}</p>
          {beforePreparation && (
            <p className="text-xs text-muted-foreground mt-2">
              Refunds can take 3–10 working days to reach your account.
            </p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please tell us why you're cancelling..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Keep Order
              </Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
