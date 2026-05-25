'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Percent, DollarSign, Gift, Star, Instagram } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { MultiDateRangePicker } from '@/components/ui/multi-date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { IRewardRule } from '@/interfaces';

/**
 * Optional positive-integer field for cadence inputs.
 *
 * REQ-046 D3 fix: an empty number `<input>` submits "" (not undefined), and
 * `z.coerce.number()` coerces "" → 0, so a plain `.min(1).optional()` rejects a
 * *blank* cadence field even though the UI invites operators to leave it blank.
 * Preprocess empty/null → undefined first so the `.optional()` branch engages
 * and the field is omitted from the payload.
 */
const optionalCount = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().min(1).optional()
);

/**
 * Form validation schema
 */
export const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  isActive: z.boolean(),
  spendThreshold: z.coerce.number().min(0, 'Must be 0 or greater'),
  triggerType: z.enum(['transaction', 'social_instagram']).default('transaction'),
  socialConfig: z.object({
    platform: z.enum(['instagram']),
    hashtag: z.string().min(2, 'Hashtag required'),
    minViews: z.coerce.number().min(0),
    maxPostsPerPeriod: z.coerce.number().min(1),
    periodType: z.enum(['weekly', 'monthly', 'campaign_duration']),
    pointsAwarded: z.coerce.number().min(1),
    postsRequired: optionalCount,
    windowDays: optionalCount,
    requireMention: z.boolean().optional(),
  }).optional(),
  rewardType: z.enum(['discount-percentage', 'discount-fixed', 'free-item', 'loyalty-points']),
  rewardValue: z.coerce.number().positive('Must be positive'),
  freeItemId: z.string().nullable().optional(),
  probability: z.coerce.number().min(0).max(100),
  maxRedemptionsPerUser: z.coerce.number().int().positive().nullable().optional(),
  validityDays: z.coerce.number().int().positive('Must be positive'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  campaignDates: z.array(z.object({
    from: z.string(),
    to: z.string(),
  })).optional(),
});

type FormData = z.infer<typeof formSchema>;

/**
 * Walk a react-hook-form error tree and return the dotted path of the first
 * leaf error (e.g. "socialConfig.postsRequired"). RHF nests errors to mirror
 * the form shape; a leaf is the node carrying a string `message`.
 */
export function firstErrorPath(
  errors: Record<string, unknown>,
  prefix = ''
): string | undefined {
  for (const key of Object.keys(errors)) {
    const node = errors[key] as Record<string, unknown> | undefined;
    if (!node || typeof node !== 'object') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof node.message === 'string') return path;
    const nested = firstErrorPath(node, path);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * Reward type options with metadata
 */
const rewardTypes = [
  {
    value: 'discount-percentage',
    label: 'Discount Percentage',
    icon: Percent,
    description: 'X% off next order',
    valueLabel: 'Percentage (%)',
    valueMin: 1,
    valueMax: 100,
    placeholder: '10',
  },
  {
    value: 'discount-fixed',
    label: 'Fixed Discount',
    icon: DollarSign,
    description: '₦X off next order',
    valueLabel: 'Amount (₦)',
    valueMin: 100,
    valueMax: 50000,
    placeholder: '1000',
  },
  {
    value: 'free-item',
    label: 'Free Item',
    icon: Gift,
    description: 'Free menu item',
    valueLabel: 'Menu Item',
    requiresItemSelection: true,
    placeholder: 'Select item',
  },
  {
    value: 'loyalty-points',
    label: 'Loyalty Points',
    icon: Star,
    description: 'Points that convert to cash (100 pts = ₦1)',
    valueLabel: 'Points',
    valueMin: 100,
    valueMax: 10000,
    placeholder: '500',
  },
] as const;

interface RewardRuleFormProps {
  initialData?: Partial<IRewardRule>;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

/**
 * Reward rule form component
 */
export function RewardRuleForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Create Rule',
}: RewardRuleFormProps) {
  const { toast } = useToast();
  const [probabilityValue, setProbabilityValue] = useState(
    initialData?.probability ? initialData.probability * 100 : 30
  );
  const [dateRanges, setDateRanges] = useState<DateRange[]>(() => {
    // Load from new campaignDates format
    if (initialData?.campaignDates && initialData.campaignDates.length > 0) {
      return initialData.campaignDates.map((range) => ({
        from: new Date(range.from),
        to: new Date(range.to),
      }));
    }
    // Fallback to legacy startDate/endDate
    if (initialData?.startDate || initialData?.endDate) {
      return [{
        from: initialData.startDate ? new Date(initialData.startDate) : undefined,
        to: initialData.endDate ? new Date(initialData.endDate) : undefined,
      }];
    }
    return [];
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      isActive: initialData?.isActive ?? true,
      spendThreshold: initialData?.spendThreshold || 0,
      triggerType: initialData?.triggerType || 'transaction',
      socialConfig: initialData?.socialConfig ? {
        platform: 'instagram',
        hashtag: initialData.socialConfig.hashtag,
        minViews: initialData.socialConfig.minViews,
        maxPostsPerPeriod: initialData.socialConfig.maxPostsPerPeriod,
        periodType: initialData.socialConfig.periodType,
        pointsAwarded: initialData.socialConfig.pointsAwarded,
        postsRequired: initialData.socialConfig.postsRequired,
        windowDays: initialData.socialConfig.windowDays,
        requireMention: initialData.socialConfig.requireMention ?? true,
      } : undefined,
      rewardType: initialData?.rewardType || 'discount-percentage',
      rewardValue: initialData?.rewardValue || 10,
      freeItemId: initialData?.freeItemId?.toString() || null,
      probability: initialData?.probability ? initialData.probability * 100 : 30,
      maxRedemptionsPerUser: initialData?.maxRedemptionsPerUser || null,
      validityDays: initialData?.validityDays || 30,
      startDate: initialData?.startDate
        ? new Date(initialData.startDate).toISOString().split('T')[0]
        : null,
      endDate: initialData?.endDate
        ? new Date(initialData.endDate).toISOString().split('T')[0]
        : null,
    },
  });

  const rewardType = watch('rewardType');
  const triggerType = watch('triggerType');
  const isActive = watch('isActive');
  const selectedType = rewardTypes.find((t) => t.value === rewardType);

  // Update probability value when slider changes
  useEffect(() => {
    setValue('probability', probabilityValue);
  }, [probabilityValue, setValue]);

  // Force loyalty-points type when social trigger is selected
  useEffect(() => {
    if (triggerType === 'social_instagram') {
      setValue('rewardType', 'loyalty-points');
    }
  }, [triggerType, setValue]);

  // D1 fix (REQ-046): the hidden <input value="instagram" /> approach below
  // doesn't reliably push the value into react-hook-form state on a fresh
  // rule (no DOM change event fires, defaultValues.socialConfig is
  // undefined). Without this, `socialConfig.platform` arrives at validation
  // as undefined, the platform enum check fails, and react-hook-form's
  // handleSubmit silently aborts (the "nothing happens on Save" symptom).
  useEffect(() => {
    if (triggerType === 'social_instagram') {
      setValue('socialConfig.platform', 'instagram');
    }
  }, [triggerType, setValue]);

  // Update form values when date ranges change
  useEffect(() => {
    if (dateRanges.length > 0) {
      // Convert DateRange[] to campaignDates format
      const campaignDates = dateRanges
        .filter((range) => range.from && range.to)
        .map((range) => ({
          from: range.from!.toISOString().split('T')[0],
          to: range.to!.toISOString().split('T')[0],
        }));
      
      setValue('campaignDates', campaignDates);
      
      // Also set legacy fields for backward compatibility (use first range)
      if (dateRanges[0]?.from) {
        setValue('startDate', dateRanges[0].from.toISOString().split('T')[0]);
      }
      if (dateRanges[0]?.to) {
        setValue('endDate', dateRanges[0].to.toISOString().split('T')[0]);
      }
    } else {
      setValue('campaignDates', undefined);
      setValue('startDate', null);
      setValue('endDate', null);
    }
  }, [dateRanges, setValue]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      // Convert probability from percentage to decimal
      const submitData = {
        ...data,
        probability: data.probability / 100,
        maxRedemptionsPerUser: data.maxRedemptionsPerUser || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        campaignDates: data.campaignDates && data.campaignDates.length > 0
          ? data.campaignDates.map((range) => ({
              from: range.from,
              to: range.to,
            }))
          : undefined,
      };

      await onSubmit(submitData as any);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit form',
        variant: 'destructive',
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit, (validationErrors) => {
        // REQ-046 D1 follow-up: surface client-side validation failures so
        // operators see *why* Save isn't progressing instead of nothing
        // happening at all. react-hook-form silently swallows them by
        // default.
        // REQ-046 D3 follow-up: drill into nested errors (e.g. socialConfig.*)
        // so the toast names the actual sub-field, not just the parent object.
        const firstField = firstErrorPath(validationErrors);
        const detail = firstField
          ? `Check the "${firstField}" field`
          : 'Some fields are invalid';
        toast({
          title: "Couldn't save: form has errors",
          description: detail,
          variant: 'destructive',
        });
      })}
      className="space-y-6"
    >
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>General details about the reward rule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Weekend Special 20% Off"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe when and how this reward is applied..."
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (rule will be applied to eligible orders)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Rule Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Rule Trigger</CardTitle>
          <CardDescription>What event triggers this reward?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                  triggerType === 'transaction'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setValue('triggerType', 'transaction')}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-background p-2 shadow-sm">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Transaction Based</div>
                    <div className="text-xs text-muted-foreground">
                      Reward triggered by purchase
                    </div>
                  </div>
                </div>
                {triggerType === 'transaction' && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>

              <div
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                  triggerType === 'social_instagram'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setValue('triggerType', 'social_instagram')}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-background p-2 shadow-sm">
                    <Instagram className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Instagram Engagement</div>
                    <div className="text-xs text-muted-foreground">
                      Reward triggered by posts/tags
                    </div>
                  </div>
                </div>
                {triggerType === 'social_instagram' && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instagram Configuration */}
      {triggerType === 'social_instagram' && (
        <Card>
          <CardHeader>
            <CardTitle>Instagram Configuration</CardTitle>
            <CardDescription>
              Configure the requirements for the Instagram reward
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="socialConfig.hashtag">Hashtag *</Label>
                <Input
                  id="socialConfig.hashtag"
                  placeholder="#wawagardenbar"
                  {...register('socialConfig.hashtag')}
                />
                <p className="text-xs text-muted-foreground">
                  The hashtag users must include in their post
                </p>
                {errors.socialConfig?.hashtag && (
                  <p className="text-sm text-red-600">
                    {errors.socialConfig.hashtag.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialConfig.minViews">Minimum Views</Label>
                <Input
                  id="socialConfig.minViews"
                  type="number"
                  min="0"
                  placeholder="100"
                  {...register('socialConfig.minViews')}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum engagement/views required to qualify
                </p>
                {errors.socialConfig?.minViews && (
                  <p className="text-sm text-red-600">
                    {errors.socialConfig.minViews.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialConfig.maxPostsPerPeriod">
                  Max Posts Per Period
                </Label>
                <Input
                  id="socialConfig.maxPostsPerPeriod"
                  type="number"
                  min="1"
                  placeholder="3"
                  {...register('socialConfig.maxPostsPerPeriod')}
                />
                {errors.socialConfig?.maxPostsPerPeriod && (
                  <p className="text-sm text-red-600">
                    {errors.socialConfig.maxPostsPerPeriod.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialConfig.periodType">Period Type</Label>
                <Select
                  value={watch('socialConfig.periodType') || 'weekly'}
                  onValueChange={(value: any) =>
                    setValue('socialConfig.periodType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="campaign_duration">Campaign Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                 <Label htmlFor="socialConfig.pointsAwarded">Points to Award *</Label>
                 <Input
                  id="socialConfig.pointsAwarded"
                  type="number"
                  min="1"
                  placeholder="500"
                  {...register('socialConfig.pointsAwarded')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setValue('socialConfig.pointsAwarded', val);
                    setValue('rewardValue', val); // Sync with main reward value
                  }}
                 />
                 {errors.socialConfig?.pointsAwarded && (
                  <p className="text-sm text-red-600">
                    {errors.socialConfig.pointsAwarded.message}
                  </p>
                )}
              </div>
              
               {/* Hidden field to set platform */}
               <input type="hidden" {...register('socialConfig.platform')} value="instagram" />
            </div>

            <div className="mt-6 space-y-4 rounded-md border border-dashed p-4">
              <div>
                <h4 className="text-sm font-semibold">
                  Cadence (optional)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Use these to require N qualifying posts within a rolling
                  window before a customer earns the points (e.g. &ldquo;3
                  posts in 7 days&rdquo;). Leave blank for the legacy
                  one-award-per-post behaviour.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="socialConfig.postsRequired">
                    Posts required
                  </Label>
                  <Input
                    id="socialConfig.postsRequired"
                    type="number"
                    min="1"
                    placeholder="3"
                    {...register('socialConfig.postsRequired')}
                  />
                  {errors.socialConfig?.postsRequired && (
                    <p className="text-sm text-red-600">
                      {errors.socialConfig.postsRequired.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialConfig.windowDays">
                    Window (days)
                  </Label>
                  <Input
                    id="socialConfig.windowDays"
                    type="number"
                    min="1"
                    placeholder="7"
                    {...register('socialConfig.windowDays')}
                  />
                  {errors.socialConfig?.windowDays && (
                    <p className="text-sm text-red-600">
                      {errors.socialConfig.windowDays.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="socialConfig.requireMention"
                    className="flex items-center justify-between"
                  >
                    <span>Require @mention</span>
                    <Switch
                      id="socialConfig.requireMention"
                      checked={watch('socialConfig.requireMention') ?? true}
                      onCheckedChange={(checked) =>
                        setValue('socialConfig.requireMention', checked)
                      }
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When on, a qualifying post must tag the bar&apos;s
                    Instagram Business account.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spend Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>Spend Threshold</CardTitle>
          <CardDescription>Minimum order amount to qualify for this reward</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="spendThreshold">Minimum Spend (₦) *</Label>
            <Input
              id="spendThreshold"
              type="number"
              min="0"
              step="100"
              placeholder="5000"
              {...register('spendThreshold')}
            />
            {errors.spendThreshold && (
              <p className="text-sm text-red-600">{errors.spendThreshold.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Set to 0 for no minimum spend requirement
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reward Configuration - Only show for transaction triggers */}
      {triggerType === 'transaction' && (
        <Card>
          <CardHeader>
            <CardTitle>Reward Configuration</CardTitle>
            <CardDescription>Type and value of the reward</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rewardType">Reward Type *</Label>
              <Select
                value={rewardType}
                onValueChange={(value: string) => setValue('rewardType', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rewardTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedType && !('requiresItemSelection' in selectedType) && (
              <div className="space-y-2">
                <Label htmlFor="rewardValue">{selectedType.valueLabel} *</Label>
                <Input
                  id="rewardValue"
                  type="number"
                  min={'valueMin' in selectedType ? selectedType.valueMin : undefined}
                  max={'valueMax' in selectedType ? selectedType.valueMax : undefined}
                  placeholder={selectedType.placeholder}
                  {...register('rewardValue')}
                />
                {errors.rewardValue && (
                  <p className="text-sm text-red-600">{errors.rewardValue.message}</p>
                )}
              </div>
            )}

            {selectedType && 'requiresItemSelection' in selectedType && selectedType.requiresItemSelection && (
              <div className="space-y-2">
                <Label htmlFor="freeItemId">Free Menu Item *</Label>
                <Input
                  id="freeItemId"
                  placeholder="Menu item ID (to be replaced with selector)"
                  {...register('freeItemId')}
                />
                {errors.freeItemId && (
                  <p className="text-sm text-red-600">{errors.freeItemId.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Note: Menu item selector to be implemented
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Probability & Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Probability & Limits</CardTitle>
          <CardDescription>Control how often this reward is issued</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Probability *</Label>
              <span className="text-2xl font-bold text-primary">
                {probabilityValue}%
              </span>
            </div>
            <Slider
              value={[probabilityValue]}
              onValueChange={(value) => setProbabilityValue(value[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Chance of receiving this reward when eligible (0% = never, 100% = always)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRedemptionsPerUser">
              Max Redemptions Per User (Optional)
            </Label>
            <Input
              id="maxRedemptionsPerUser"
              type="number"
              min="1"
              placeholder="Unlimited"
              {...register('maxRedemptionsPerUser')}
            />
            {errors.maxRedemptionsPerUser && (
              <p className="text-sm text-red-600">
                {errors.maxRedemptionsPerUser.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Leave empty for unlimited redemptions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="validityDays">Validity Period (Days) *</Label>
            <Input
              id="validityDays"
              type="number"
              min="1"
              placeholder="30"
              {...register('validityDays')}
            />
            {errors.validityDays && (
              <p className="text-sm text-red-600">{errors.validityDays.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Number of days until the reward expires after being issued
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Schedule (Optional)</CardTitle>
          <CardDescription>
            Set start and end dates for time-limited campaigns (up to 1 year in advance)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Campaign Date Ranges</Label>
            <MultiDateRangePicker
              value={dateRanges}
              onChange={setDateRanges}
              placeholder="Select campaign dates"
              minDate={new Date()}
              maxDate={addYears(new Date(), 1)}
            />
            {(errors.startDate || errors.endDate || errors.campaignDates) && (
              <p className="text-sm text-red-600">
                {errors.startDate?.message || errors.endDate?.message || errors.campaignDates?.message}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Leave empty for permanent rules. Select multiple date ranges for non-contiguous campaigns
            (e.g., weekends only, specific holidays). You can select dates up to 1 year in advance.
            Use the "Clear All" button to remove all selected dates.
          </p>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
