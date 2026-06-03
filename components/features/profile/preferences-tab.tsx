'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { IPreferences } from '@/interfaces';
import { updatePreferencesAction } from '@/app/actions/profile/profile-actions';

const preferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()),
  communicationPreferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    // REQ-053 — WhatsApp opt-in surface.
    whatsappTransactional: z.boolean(),
    whatsappMarketing: z.boolean(),
    // REQ-063 — separate gate for marketing email.
    emailMarketing: z.boolean(),
  }),
  language: z.string(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface PreferencesTabProps {
  preferences?: IPreferences;
}

const commonDietaryRestrictions = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut Allergy',
  'Halal',
  'Kosher',
  'Low-Carb',
  'Keto',
];

/**
 * Preferences tab component
 */
export function PreferencesTab({ preferences }: PreferencesTabProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customRestriction, setCustomRestriction] = useState('');

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { isDirty },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      dietaryRestrictions: preferences?.dietaryRestrictions || [],
      communicationPreferences: preferences?.communicationPreferences || {
        email: true,
        sms: false,
        push: false,
        // REQ-053 — WhatsApp opt-in defaults (transactional consent
        // assumed, marketing requires explicit opt-in).
        whatsappTransactional: true,
        whatsappMarketing: false,
        // REQ-063 — email marketing requires explicit opt-in.
        emailMarketing: false,
      },
      language: preferences?.language || 'en',
    },
  });

  const dietaryRestrictions = watch('dietaryRestrictions');
  const communicationPreferences = watch('communicationPreferences');

  const toggleRestriction = (restriction: string) => {
    const current = dietaryRestrictions || [];
    if (current.includes(restriction)) {
      setValue(
        'dietaryRestrictions',
        current.filter((r) => r !== restriction),
        { shouldDirty: true }
      );
    } else {
      setValue('dietaryRestrictions', [...current, restriction], {
        shouldDirty: true,
      });
    }
  };

  const addCustomRestriction = () => {
    if (!customRestriction.trim()) return;

    const current = dietaryRestrictions || [];
    if (!current.includes(customRestriction.trim())) {
      setValue('dietaryRestrictions', [...current, customRestriction.trim()], {
        shouldDirty: true,
      });
    }
    setCustomRestriction('');
  };

  const removeRestriction = (restriction: string) => {
    const current = dietaryRestrictions || [];
    setValue(
      'dietaryRestrictions',
      current.filter((r) => r !== restriction),
      { shouldDirty: true }
    );
  };

  const onSubmit = async (data: PreferencesFormData) => {
    setIsLoading(true);
    try {
      const result = await updatePreferencesAction(data);

      if (result.success) {
        toast({
          title: 'Preferences updated',
          description: 'Your preferences have been saved successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update preferences',
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Dietary Restrictions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Dietary Restrictions</h3>
          <p className="text-sm text-muted-foreground">
            Select your dietary preferences to help us recommend suitable menu
            items
          </p>
        </div>

        {/* Common Restrictions */}
        <div className="flex flex-wrap gap-2">
          {commonDietaryRestrictions.map((restriction) => (
            <Badge
              key={restriction}
              variant={
                dietaryRestrictions?.includes(restriction)
                  ? 'default'
                  : 'outline'
              }
              className="cursor-pointer"
              onClick={() => toggleRestriction(restriction)}
            >
              {restriction}
            </Badge>
          ))}
        </div>

        {/* Custom Restrictions */}
        {dietaryRestrictions && dietaryRestrictions.length > 0 && (
          <div className="space-y-2">
            <Label>Your Dietary Restrictions</Label>
            <div className="flex flex-wrap gap-2">
              {dietaryRestrictions.map((restriction) => (
                <Badge key={restriction} variant="secondary">
                  {restriction}
                  <button
                    type="button"
                    onClick={() => removeRestriction(restriction)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Restriction */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom dietary restriction"
            value={customRestriction}
            onChange={(e) => setCustomRestriction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomRestriction();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustomRestriction}
            disabled={!customRestriction.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Communication Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to receive updates about your orders
          </p>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive order updates and promotions via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={communicationPreferences.email}
              onCheckedChange={(checked) =>
                setValue('communicationPreferences.email', checked, {
                  shouldDirty: true,
                })
              }
            />
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive order status updates via SMS
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={communicationPreferences.sms}
              onCheckedChange={(checked) =>
                setValue('communicationPreferences.sms', checked, {
                  shouldDirty: true,
                })
              }
            />
          </div>

          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications in your browser
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={communicationPreferences.push}
              onCheckedChange={(checked) =>
                setValue('communicationPreferences.push', checked, {
                  shouldDirty: true,
                })
              }
            />
          </div>

          {/* REQ-053 — WhatsApp transactional opt-in */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp-transactional">
                WhatsApp — order updates &amp; receipts
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive order confirmations, status updates and receipts via
                WhatsApp.
              </p>
            </div>
            <Switch
              id="whatsapp-transactional"
              checked={communicationPreferences.whatsappTransactional}
              onCheckedChange={(checked) =>
                setValue(
                  'communicationPreferences.whatsappTransactional',
                  checked,
                  { shouldDirty: true }
                )
              }
            />
          </div>

          {/* REQ-053 — WhatsApp marketing opt-in */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp-marketing">
                WhatsApp — offers &amp; promotions
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive promotional offers, loyalty updates and reward
                expirations via WhatsApp.
              </p>
            </div>
            <Switch
              id="whatsapp-marketing"
              checked={communicationPreferences.whatsappMarketing}
              onCheckedChange={(checked) =>
                setValue(
                  'communicationPreferences.whatsappMarketing',
                  checked,
                  { shouldDirty: true }
                )
              }
            />
          </div>

          {/* REQ-063 — email marketing opt-in (separate gate from
              transactional email above). */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-marketing">
                Email — offers &amp; promotions
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive promotional offers and reward updates by email. Order
                confirmations are controlled separately by Email Notifications.
              </p>
            </div>
            <Switch
              id="email-marketing"
              checked={communicationPreferences.emailMarketing}
              onCheckedChange={(checked) =>
                setValue('communicationPreferences.emailMarketing', checked, {
                  shouldDirty: true,
                })
              }
            />
          </div>
        </div>
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
            'Save Preferences'
          )}
        </Button>
      </div>
    </form>
  );
}
