'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { IUser } from '@/interfaces';
import { instagramHandleSchema } from '@/lib/validation/profile';
import { updateProfileAction } from '@/app/actions/profile/profile-actions';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      'Invalid phone number format (use E.164 format)'
    )
    .optional()
    .or(z.literal('')),
  // REQ-057 — Instagram handle pipe shared with the server-side schema
  // so client + server apply the same transform (strip leading `@`,
  // trim) and the same character-set refine.
  instagramHandle: instagramHandleSchema.optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface PersonalInfoTabProps {
  profile: IUser;
}

/**
 * Personal information tab component
 */
export function PersonalInfoTab({ profile }: PersonalInfoTabProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phone: profile.phone || '',
      instagramHandle: profile.socialProfiles?.instagram?.handle || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const result = await updateProfileAction(data);

      if (result.success) {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. Contact support if you need to update it.
          </p>
        </div>

        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="Enter your first name"
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder="Enter your last name"
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+234XXXXXXXXXX"
            type="tel"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Use international format (e.g., +234XXXXXXXXXX)
          </p>
        </div>

        {/* Instagram Handle */}
        <div className="space-y-2">
          <Label htmlFor="instagramHandle" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Instagram Handle
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">
              @
            </span>
            <Input
              id="instagramHandle"
              {...register('instagramHandle')}
              placeholder="username"
              className="pl-7"
            />
          </div>
          {errors.instagramHandle && (
            <p className="text-sm text-destructive">
              {errors.instagramHandle.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Required to earn points on Instagram tagging campaigns — we use this
            to match your tags to your account.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !isDirty}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
