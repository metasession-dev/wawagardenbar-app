'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, SubmitButton } from '@/components/shared/forms';
import { QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const dineInSchema = z.object({
  tableNumber: z
    .string()
    .min(1, 'Table number is required')
    .regex(/^\d+$/, 'Must be a valid table number'),
});

type DineInFormData = z.infer<typeof dineInSchema>;

export function DineInForm() {
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DineInFormData>({
    resolver: zodResolver(dineInSchema),
  });

  async function onSubmit(data: DineInFormData) {
    try {
      // TODO: Create Server Action to save order type and table number to session
      toast({
        title: 'Table Set!',
        description: `You're ordering from Table ${data.tableNumber}`,
      });

      // Redirect to menu with order type in URL
      router.push(`/menu?type=dine-in&table=${data.tableNumber}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set table number. Please try again.',
        variant: 'destructive',
      });
    }
  }

  function handleQRScan() {
    // TODO: Implement QR scanner
    // For now, show a message
    toast({
      title: 'QR Scanner',
      description: 'QR scanner will be implemented in the next phase',
    });
    setShowScanner(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Scan the QR code on your table to automatically set your table
            number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleQRScan}
          >
            <QrCode className="mr-2 h-5 w-5" />
            Scan QR Code
          </Button>
          {showScanner && (
            <div className="mt-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted p-8 text-center">
              <QrCode className="mx-auto mb-2 h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                QR Scanner will be implemented in Phase 2
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or enter manually
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Table Number</CardTitle>
          <CardDescription>
            Type your table number to start ordering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              label="Table Number"
              type="text"
              inputMode="numeric"
              placeholder="e.g., 12"
              error={errors.tableNumber?.message}
              required
              {...register('tableNumber')}
            />

            <SubmitButton isLoading={isSubmitting} className="w-full" size="lg">
              Continue to Menu
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Your order will be delivered to your table.
          Please ensure you're seated at the correct table number.
        </p>
      </div>
    </div>
  );
}
