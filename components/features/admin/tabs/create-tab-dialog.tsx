'use client';

import React, { useState, useTransition, cloneElement, isValidElement } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createAdminTabAction } from '@/app/actions/tabs/tab-actions';

const formSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTabDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tableNumber: '',
    },
  });

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const result = await createAdminTabAction({
          tableNumber: values.tableNumber,
        });

        if (result.success && result.data?.tab) {
          toast({
            title: 'Tab created',
            description: `Tab #${result.data.tab.tabNumber} created successfully.`,
          });
          setOpen(false);
          form.reset();
          // Redirect to the new tab details page
          router.push(`/dashboard/orders/tabs/${result.data.tab._id}`);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to create tab',
            description: result.error || 'An error occurred',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Something went wrong. Please try again.',
        });
      }
    });
  }

  const defaultTrigger = (
    <Button type="button">
      <Plus className="mr-2 h-4 w-4" />
      Create Tab / Open Order
    </Button>
  );
  const triggerElement = trigger ?? defaultTrigger;

  function openDialog() {
    setOpen(true);
  }

  const interactiveTrigger = isValidElement(triggerElement)
    ? cloneElement(triggerElement as React.ReactElement, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          openDialog();
        },
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDialog();
          }
        },
      })
    : triggerElement;

  return (
    <>
      {interactiveTrigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Tab</DialogTitle>
          <DialogDescription>
            Start a new tab for a table. Only table number is required.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tableNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Table Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tab
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
