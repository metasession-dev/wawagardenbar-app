'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Container, MainLayout } from '@/components/shared/layout';
import { useToast } from '@/hooks/use-toast';
import { requestDataDeletionAction } from '@/app/actions/profile/profile-actions';

const deletionSchema = z.object({
  email: z.string().min(1, 'Please enter a valid email or phone number'),
  reason: z
    .string()
    .min(10, 'Please provide a reason (at least 10 characters)'),
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Please type DELETE to confirm' }),
  }),
});

type DeletionFormData = z.infer<typeof deletionSchema>;

interface DataDeletionFormProps {
  initialEmail?: string;
}

export function DataDeletionForm({ initialEmail }: DataDeletionFormProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeletionFormData>({
    resolver: zodResolver(deletionSchema),
    defaultValues: {
      email: initialEmail || '',
    },
  });

  const onSubmit = async (data: DeletionFormData) => {
    try {
      const result = await requestDataDeletionAction(data.email, data.reason);

      if (result.success) {
        setIsSubmitted(true);
        setTicketId(result.data?.ticketId || 'PENDING');
        toast({
          title: 'Request Submitted',
          description: 'Your data deletion request has been received.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  if (isSubmitted) {
    return (
      <MainLayout>
        <Container className="py-12 max-w-lg">
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Request Received</CardTitle>
              <CardDescription>
                We have received your data deletion request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your request ID is:{' '}
                <span className="font-mono font-medium text-foreground">
                  {ticketId}
                </span>
              </p>
              <p className="text-sm">
                We will process your request within 30 days in accordance with
                applicable data protection laws. You will receive a confirmation
                email once the process is complete.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/">Return Home</Link>
              </Button>
            </CardContent>
          </Card>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container className="py-12 max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Data Deletion Request
          </h1>
          <p className="mt-2 text-muted-foreground">
            Request permanent deletion of your account and personal data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Delete My Data</CardTitle>
            <CardDescription>
              This action is permanent and cannot be undone. All your data,
              including order history and rewards, will be permanently removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Once processed, you will lose access to your account and all
                associated data immediately.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Email or Phone Number
                </Label>
                <Input
                  id="email"
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                  placeholder="name@example.com or Phone Number"
                  {...register('email')}
                />
                <p className="text-xs text-muted-foreground">
                  This is the account identifier currently logged in.
                </p>
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Deletion</Label>
                <Textarea
                  id="reason"
                  placeholder="Please tell us why you want to delete your data..."
                  {...register('reason')}
                />
                {errors.reason && (
                  <p className="text-sm text-destructive">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation">Type "DELETE" to confirm</Label>
                <Input
                  id="confirmation"
                  placeholder="DELETE"
                  {...register('confirmation')}
                />
                {errors.confirmation && (
                  <p className="text-sm text-destructive">
                    {errors.confirmation.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Deletion Request'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </MainLayout>
  );
}
