'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Search,
  Loader2,
  User,
  Mail,
  Phone,
  Gift,
  Percent,
  DollarSign,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  searchUsersAction,
  issueManualRewardAction,
} from '@/app/actions/admin/manual-reward-actions';
import { IUser } from '@/interfaces';

// Zod validation schema
const rewardFormSchema = z
  .object({
    rewardType: z.enum(
      ['discount-percentage', 'discount-fixed', 'loyalty-points'],
      {
        required_error: 'Please select a reward type',
      }
    ),
    rewardValue: z
      .string()
      .min(1, 'Reward value is required')
      .refine((val) => !isNaN(parseFloat(val)), 'Please enter a valid number')
      .refine((val) => parseFloat(val) > 0, 'Value must be greater than 0'),
    validityDays: z
      .string()
      .min(1, 'Validity period is required')
      .refine((val) => !isNaN(parseInt(val)), 'Please enter a valid number')
      .refine((val) => parseInt(val) > 0, 'Must be at least 1 day')
      .refine((val) => parseInt(val) <= 365, 'Cannot exceed 365 days'),
    description: z
      .string()
      .max(200, 'Description cannot exceed 200 characters')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.rewardType === 'discount-percentage') {
        const value = parseFloat(data.rewardValue);
        return value <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['rewardValue'],
    }
  );

type RewardFormValues = z.infer<typeof rewardFormSchema>;

/**
 * Manual Reward Issuance Page
 * Allows admins to search for users and issue rewards directly
 */
export default function IssueRewardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RewardFormValues>({
    resolver: zodResolver(rewardFormSchema),
    mode: 'onChange', // Validate on change for real-time feedback
    defaultValues: {
      rewardType: 'discount-percentage',
      rewardValue: '',
      validityDays: '30',
      description: '',
    },
  });

  // Watch form values for dynamic UI updates
  const rewardType = watch('rewardType');
  const rewardValue = watch('rewardValue');
  const validityDays = watch('validityDays');
  const description = watch('description') || '';

  // Handle user search
  const handleSearch = async () => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      toast({
        title: 'Invalid Search',
        description: 'Please enter at least 3 characters to search',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchUsersAction(searchQuery);
      if (result.success && result.data) {
        setSearchResults(result.data.users);
        if (result.data.users.length === 0) {
          toast({
            title: 'No Results',
            description: 'No users found matching your search',
          });
        }
      } else {
        toast({
          title: 'Search Failed',
          description: result.error || 'Failed to search users',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while searching',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user selection
  const handleSelectUser = (user: IUser) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Handle form submission
  const onSubmit = async (data: RewardFormValues) => {
    if (!selectedUser) {
      toast({
        title: 'No User Selected',
        description: 'Please select a user first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await issueManualRewardAction({
        userId: selectedUser._id.toString(),
        rewardType: data.rewardType,
        rewardValue: parseFloat(data.rewardValue),
        validityDays: parseInt(data.validityDays),
        description: data.description || `Manual reward: ${data.rewardType}`,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Reward issued successfully',
        });

        // Reset form and user selection
        setSelectedUser(null);
        reset();

        // Redirect to issued rewards page
        setTimeout(() => {
          router.push('/dashboard/rewards/issued');
        }, 1500);
      } else {
        toast({
          title: 'Failed',
          description: result.error || 'Failed to issue reward',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while issuing the reward',
        variant: 'destructive',
      });
    }
  };

  const getRewardIcon = () => {
    switch (rewardType) {
      case 'discount-percentage':
        return <Percent className="h-5 w-5" />;
      case 'discount-fixed':
        return <DollarSign className="h-5 w-5" />;
      case 'loyalty-points':
        return <Star className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  const getRewardValueDisplay = () => {
    if (!rewardValue) return '';
    switch (rewardType) {
      case 'discount-percentage':
        return `${rewardValue}% off`;
      case 'discount-fixed':
        return `₦${parseFloat(rewardValue).toLocaleString()} off`;
      case 'loyalty-points':
        return `${rewardValue} points`;
      default:
        return rewardValue;
    }
  };

  // Check if form can be submitted
  const canSubmit = selectedUser !== null && isValid && !isSubmitting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/rewards">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Issue Manual Reward
          </h1>
          <p className="text-muted-foreground mt-1">
            Search for a customer and issue a reward directly
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Search Section */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Customer</CardTitle>
              <CardDescription>Search by email or phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter email or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    disabled={isSearching}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Search Results</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <Card
                        key={user._id.toString()}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelectUser(user)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {user.firstName} {user.lastName}
                                </span>
                              </div>
                              {user.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{user.email}</span>
                                </div>
                              )}
                              {user.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                            <Badge variant="outline">{user.role}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className="space-y-2">
                  <Label>Selected Customer</Label>
                  <Card className="border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {selectedUser.firstName} {selectedUser.lastName}
                            </span>
                          </div>
                          {selectedUser.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{selectedUser.email}</span>
                            </div>
                          )}
                          {selectedUser.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{selectedUser.phone}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(null)}
                        >
                          Change
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reward Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle>2. Configure Reward</CardTitle>
              <CardDescription>
                Set the reward type, value, and validity period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reward Type */}
              <div className="space-y-2">
                <Label htmlFor="rewardType">Reward Type</Label>
                <Controller
                  name="rewardType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="rewardType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount-percentage">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            <span>Percentage Discount</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="discount-fixed">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Fixed Discount</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="loyalty-points">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            <span>Loyalty Points</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.rewardType && (
                  <p className="text-sm text-red-500">
                    {errors.rewardType.message}
                  </p>
                )}
              </div>

              {/* Reward Value */}
              <div className="space-y-2">
                <Label htmlFor="rewardValue">
                  {rewardType === 'discount-percentage' &&
                    'Discount Percentage'}
                  {rewardType === 'discount-fixed' && 'Discount Amount (₦)'}
                  {rewardType === 'loyalty-points' && 'Points Amount'}
                </Label>
                <Controller
                  name="rewardValue"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="rewardValue"
                      type="number"
                      placeholder={
                        rewardType === 'discount-percentage'
                          ? 'e.g., 10'
                          : rewardType === 'discount-fixed'
                            ? 'e.g., 500'
                            : 'e.g., 100'
                      }
                      min="1"
                      max={
                        rewardType === 'discount-percentage' ? '100' : undefined
                      }
                      step={rewardType === 'discount-percentage' ? '1' : '10'}
                      className={errors.rewardValue ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.rewardValue && (
                  <p className="text-sm text-red-500">
                    {errors.rewardValue.message}
                  </p>
                )}
                {!errors.rewardValue && rewardValue && (
                  <p className="text-sm text-muted-foreground">
                    Customer will receive:{' '}
                    <strong>{getRewardValueDisplay()}</strong>
                  </p>
                )}
                {!errors.rewardValue &&
                  rewardType === 'discount-percentage' &&
                  !rewardValue && (
                    <p className="text-xs text-muted-foreground">
                      Enter a value between 1-100
                    </p>
                  )}
              </div>

              {/* Validity Days */}
              <div className="space-y-2">
                <Label htmlFor="validityDays">Validity Period (Days)</Label>
                <Controller
                  name="validityDays"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="validityDays"
                      type="number"
                      placeholder="e.g., 30"
                      min="1"
                      max="365"
                      className={errors.validityDays ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.validityDays && (
                  <p className="text-sm text-red-500">
                    {errors.validityDays.message}
                  </p>
                )}
                {!errors.validityDays && (
                  <p className="text-sm text-muted-foreground">
                    Reward will expire in {validityDays || '0'} days (max 365
                    days)
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="description"
                      placeholder="e.g., Welcome bonus, Loyalty appreciation, etc."
                      rows={3}
                      maxLength={200}
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">
                    {errors.description.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-right">
                  {description.length}/200 characters
                </p>
              </div>

              {/* Issue Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Issuing Reward...
                  </>
                ) : (
                  <>
                    {getRewardIcon()}
                    <span className="ml-2">Issue Reward</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>How it works:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                Search for a registered customer by their email or phone number
              </li>
              <li>Select the customer from the search results</li>
              <li>Configure the reward type, value, and validity period</li>
              <li>
                The reward will be immediately available in the customer's
                profile
              </li>
              <li>Customer can apply the reward during checkout</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
