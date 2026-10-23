'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { requestOrderModificationAction } from '@/app/actions/communication/communication-actions';

const modificationSchema = z.object({
  modificationType: z.enum([
    'add-items',
    'remove-items',
    'change-time',
    'change-address',
    'other',
  ]),
  details: z
    .string()
    .min(10, 'Please provide more details (at least 10 characters)'),
});

type ModificationFormData = z.infer<typeof modificationSchema>;

interface OrderModificationFormProps {
  orderId: string;
  orderNumber: string;
}

/**
 * Order modification request form
 * Allows customers to request changes to their order
 */
export function OrderModificationForm({
  orderId,
  orderNumber,
}: OrderModificationFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ModificationFormData>({
    resolver: zodResolver(modificationSchema),
    defaultValues: {
      modificationType: 'other',
      details: '',
    },
  });

  async function onSubmit(data: ModificationFormData) {
    try {
      setLoading(true);

      const result = await requestOrderModificationAction({
        orderId,
        ...data,
      });

      if (result.success) {
        toast({
          title: 'Request Submitted',
          description: result.message,
        });
        setOpen(false);
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting modification request:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Request Modification
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Order Modification</DialogTitle>
          <DialogDescription>
            Order #{orderNumber} - Submit a request to modify your order
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="modificationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modification Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select modification type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="add-items">Add Items</SelectItem>
                      <SelectItem value="remove-items">Remove Items</SelectItem>
                      <SelectItem value="change-time">
                        Change Pickup/Delivery Time
                      </SelectItem>
                      <SelectItem value="change-address">
                        Change Delivery Address
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe the changes you'd like to make..."
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
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
