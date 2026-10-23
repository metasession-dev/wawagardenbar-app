'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { IAddress } from '@/interfaces';
import {
  addAddressAction,
  updateAddressAction,
} from '@/app/actions/profile/profile-actions';

const addressSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  streetAddress: z.string().min(5, 'Street address is required').max(200),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  postalCode: z.string().min(3, 'Postal code is required').max(20),
  country: z.string().min(2, 'Country is required').max(100),
  deliveryInstructions: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: IAddress;
  onSuccess: (address: IAddress) => void;
}

/**
 * Address form dialog for add/edit
 */
export function AddressFormDialog({
  open,
  onOpenChange,
  address,
  onSuccess,
}: AddressFormDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!address;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof addressSchema>, unknown, AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          label: address.label,
          streetAddress: address.streetAddress,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          deliveryInstructions: address.deliveryInstructions || '',
          isDefault: address.isDefault,
        }
      : {
          label: '',
          streetAddress: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Nigeria',
          deliveryInstructions: '',
          isDefault: false,
        },
  });

  const isDefault = watch('isDefault');

  const onSubmit = async (data: AddressFormData) => {
    setIsLoading(true);
    try {
      let result;

      if (isEditing && address._id) {
        result = await updateAddressAction(address._id.toString(), data);
      } else {
        result = await addAddressAction(data);
      }

      if (result.success && result.data) {
        const updatedAddress = isEditing
          ? result.data.addresses.find(
              (a: IAddress) => a._id?.toString() === address._id?.toString()
            )
          : result.data.addresses[result.data.addresses.length - 1];

        if (updatedAddress) {
          onSuccess(updatedAddress);
          toast({
            title: isEditing ? 'Address updated' : 'Address added',
            description: `Your address has been ${isEditing ? 'updated' : 'added'} successfully.`,
          });
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save address',
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Address' : 'Add New Address'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your delivery address details'
              : 'Add a new delivery address to your account'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">
              Address Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="label"
              {...register('label')}
              placeholder="e.g., Home, Work, Mom's House"
            />
            {errors.label && (
              <p className="text-sm text-destructive">{errors.label.message}</p>
            )}
          </div>

          {/* Street Address */}
          <div className="space-y-2">
            <Label htmlFor="streetAddress">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="streetAddress"
              {...register('streetAddress')}
              placeholder="123 Main Street, Apt 4B"
            />
            {errors.streetAddress && (
              <p className="text-sm text-destructive">
                {errors.streetAddress.message}
              </p>
            )}
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input id="city" {...register('city')} placeholder="Lagos" />
              {errors.city && (
                <p className="text-sm text-destructive">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">
                State <span className="text-destructive">*</span>
              </Label>
              <Input id="state" {...register('state')} placeholder="Lagos" />
              {errors.state && (
                <p className="text-sm text-destructive">
                  {errors.state.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">
                Postal Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="postalCode"
                {...register('postalCode')}
                placeholder="100001"
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">
                  {errors.postalCode.message}
                </p>
              )}
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">
              Country <span className="text-destructive">*</span>
            </Label>
            <Input
              id="country"
              {...register('country')}
              placeholder="Nigeria"
            />
            {errors.country && (
              <p className="text-sm text-destructive">
                {errors.country.message}
              </p>
            )}
          </div>

          {/* Delivery Instructions */}
          <div className="space-y-2">
            <Label htmlFor="deliveryInstructions">
              Delivery Instructions (Optional)
            </Label>
            <Textarea
              id="deliveryInstructions"
              {...register('deliveryInstructions')}
              placeholder="e.g., Ring the doorbell twice, Gate code is 1234"
              rows={3}
            />
            {errors.deliveryInstructions && (
              <p className="text-sm text-destructive">
                {errors.deliveryInstructions.message}
              </p>
            )}
          </div>

          {/* Set as Default */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={isDefault}
              onCheckedChange={(checked) =>
                setValue('isDefault', checked as boolean)
              }
            />
            <Label
              htmlFor="isDefault"
              className="text-sm font-normal cursor-pointer"
            >
              Set as default delivery address
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Address'
              ) : (
                'Add Address'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
