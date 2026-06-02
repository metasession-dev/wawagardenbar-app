import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/shared/layout';
import { Container } from '@/components/shared/layout';
import { RewardsService, PointsService } from '@/services';
import { InstagramService } from '@/services/instagram-service';
import { InstagramCampaignCard } from '@/components/features/rewards/instagram-campaign-card';
import { sessionOptions, SessionData } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gift,
  TrendingUp,
  Award,
  Clock,
  Percent,
  DollarSign,
  ShoppingBag,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { IReward, IRewardRule } from '@/interfaces';
import { IPointsTransaction } from '@/models/points-transaction-model';

/**
 * User rewards page
 * Shows active rewards, history, and statistics
 */
export default async function RewardsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.userId) {
    redirect('/login?redirect=/profile/rewards');
  }

  const [
    activeRewards,
    rewardHistory,
    stats,
    availableRules,
    pointsBalance,
    pointsTransactions,
    igCampaigns,
  ] = await Promise.all([
    RewardsService.getUserActiveRewards(session.userId),
    RewardsService.getUserRewardHistory(session.userId, { limit: 10 }),
    RewardsService.getUserRewardStats(session.userId),
    RewardsService.getAvailableRulesForUser(session.userId),
    PointsService.getBalance(session.userId),
    PointsService.getTransactionHistory(session.userId, 10, 0),
    // REQ-060 — active IG-campaign progress for `<InstagramCampaignCard>`.
    // Defensive: aggregator returns [] on DB failure so this page never
    // crashes on the IG read path.
    InstagramService.getActiveCampaignsForUser(session.userId),
  ]);

  return (
    <MainLayout>
      <Container size="xl" className="py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Rewards</h1>
          <p className="text-muted-foreground">
            Manage your rewards and track your savings
          </p>
        </div>

        {/* REQ-060 — Instagram campaign progress (renders nothing when no active campaigns) */}
        <InstagramCampaignCard campaigns={igCampaigns} />

        {/* Statistics Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Gift className="h-4 w-4 text-primary" />
                Active Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.activeRewards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalEarned}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Award className="h-4 w-4 text-yellow-600" />
                Total Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ₦{stats.totalSavings.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Award className="h-4 w-4 text-purple-600" />
                Loyalty Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {pointsBalance.balance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                = ₦{pointsBalance.nairaValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Types of Rewards Available */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Types of Rewards Available</CardTitle>
            <CardDescription>
              Earn rewards automatically when you place orders that meet
              spending thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Gift className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">
                  No rewards campaigns currently running
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back soon for new reward opportunities!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableRules.map((rule) => (
                  <RewardRuleCard key={rule._id.toString()} rule={rule} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Active Rewards ({activeRewards.length})
            </TabsTrigger>
            <TabsTrigger value="points">
              Points History ({pointsTransactions.total})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({rewardHistory.total})
            </TabsTrigger>
          </TabsList>

          {/* Active Rewards Tab */}
          <TabsContent value="active" className="space-y-4">
            {activeRewards.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No active rewards
                  </h3>
                  <p className="mb-4 text-center text-muted-foreground">
                    Keep ordering to earn rewards!
                  </p>
                  <Link href="/menu">
                    <Button>Browse Menu</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeRewards.map((reward) => (
                  <RewardCard key={reward._id.toString()} reward={reward} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Points History Tab */}
          <TabsContent value="points" className="space-y-4">
            {pointsTransactions.transactions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No points transactions
                  </h3>
                  <p className="text-center text-muted-foreground">
                    Your points transaction history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pointsTransactions.transactions.map((transaction) => (
                  <PointsTransactionCard
                    key={transaction._id.toString()}
                    transaction={transaction}
                    conversionRate={pointsBalance.conversionRate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {rewardHistory.rewards.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No reward history
                  </h3>
                  <p className="text-center text-muted-foreground">
                    Your reward history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rewardHistory.rewards.map((reward) => (
                  <RewardHistoryCard
                    key={reward._id.toString()}
                    reward={reward}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Container>
    </MainLayout>
  );
}

/**
 * Active reward card component
 */
function RewardCard({ reward }: { reward: IReward }) {
  function getRewardTitle(rewardType: string, value: number): string {
    switch (rewardType) {
      case 'discount-percentage':
        return `${value}% Discount`;
      case 'discount-fixed':
        return `₦${value.toLocaleString()} Off`;
      case 'free-item':
        return 'Free Item';
      case 'loyalty-points':
        return `${value} Loyalty Points`;
      default:
        return 'Reward';
    }
  }

  function formatExpiryDate(date: Date): string {
    const expiryDate = new Date(date);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return 'Expires today!';
    }
    if (diffDays <= 3) {
      return `Expires in ${diffDays} days`;
    }
    return `Valid until ${expiryDate.toLocaleDateString()}`;
  }

  const expiryWarning =
    new Date(reward.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {getRewardTitle(reward.rewardType, reward.rewardValue)}
            </CardTitle>
            <CardDescription className="mt-1">
              Reward Code:{' '}
              <code className="font-mono font-semibold">{reward.code}</code>
            </CardDescription>
          </div>
          <Badge variant={expiryWarning ? 'destructive' : 'secondary'}>
            {formatExpiryDate(reward.expiresAt)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          <Link href="/menu" className="flex-1">
            <Button className="w-full" variant="default">
              Use Now
            </Button>
          </Link>
          <Link href="/checkout">
            <Button variant="outline">Apply at Checkout</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Reward history card component
 */
function RewardHistoryCard({ reward }: { reward: IReward }) {
  function getRewardTitle(rewardType: string, value: number): string {
    switch (rewardType) {
      case 'discount-percentage':
        return `${value}% Discount`;
      case 'discount-fixed':
        return `₦${value.toLocaleString()} Off`;
      case 'free-item':
        return 'Free Item';
      case 'loyalty-points':
        return `${value} Loyalty Points`;
      default:
        return 'Reward';
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'redeemed':
        return <Badge variant="secondary">Redeemed</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">
              {getRewardTitle(reward.rewardType, reward.rewardValue)}
            </p>
            <p className="text-sm text-muted-foreground">
              Code: {reward.code} • Earned{' '}
              {new Date(reward.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          {getStatusBadge(reward.status)}
          {reward.redeemedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Redeemed {new Date(reward.redeemedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Points transaction card component
 */
function PointsTransactionCard({
  transaction,
  conversionRate,
}: {
  transaction: IPointsTransaction;
  conversionRate: number;
}) {
  function getTransactionIcon(type: string) {
    switch (type) {
      case 'earned':
        return <ArrowUp className="h-5 w-5 text-green-600" />;
      case 'spent':
        return <ArrowDown className="h-5 w-5 text-red-600" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'adjusted':
        return <Minus className="h-5 w-5 text-blue-600" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  }

  function getTransactionColor(type: string) {
    switch (type) {
      case 'earned':
        return 'text-green-600';
      case 'spent':
        return 'text-red-600';
      case 'expired':
        return 'text-orange-600';
      case 'adjusted':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  }

  const nairaValue = Math.floor(Math.abs(transaction.amount) / conversionRate);

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-muted p-3">
            {getTransactionIcon(transaction.type)}
          </div>
          <div>
            <p className="font-semibold">{transaction.description}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}
          >
            {transaction.amount > 0 ? '+' : ''}
            {transaction.amount.toLocaleString()} pts
          </p>
          <p className="text-xs text-muted-foreground">
            ≈ ₦{nairaValue.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Balance: {transaction.balanceAfter.toLocaleString()} pts
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Reward rule card component - shows available reward types
 */
function RewardRuleCard({ rule }: { rule: IRewardRule }) {
  function getRewardIcon(rewardType: string) {
    switch (rewardType) {
      case 'discount-percentage':
        return <Percent className="h-5 w-5" />;
      case 'discount-fixed':
        return <DollarSign className="h-5 w-5" />;
      case 'free-item':
        return <ShoppingBag className="h-5 w-5" />;
      case 'loyalty-points':
        return <Star className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  }

  function getRewardDescription(rule: IRewardRule): string {
    const threshold = `₦${rule.spendThreshold.toLocaleString()}`;
    const probability = rule.probability
      ? `${rule.probability}% chance`
      : 'Random chance';

    switch (rule.rewardType) {
      case 'discount-percentage':
        return `Spend ${threshold} or more to get a ${probability} of earning ${rule.rewardValue}% off your next order`;
      case 'discount-fixed':
        return `Spend ${threshold} or more to get a ${probability} of earning ₦${rule.rewardValue.toLocaleString()} off your next order`;
      case 'free-item':
        return `Spend ${threshold} or more to get a ${probability} of earning a free item`;
      case 'loyalty-points':
        return `Spend ${threshold} or more to get a ${probability} of earning ${rule.rewardValue} loyalty points`;
      default:
        return `Spend ${threshold} or more to earn rewards`;
    }
  }

  function getRewardTitle(rewardType: string, value: number): string {
    switch (rewardType) {
      case 'discount-percentage':
        return `${value}% Discount`;
      case 'discount-fixed':
        return `₦${value.toLocaleString()} Off`;
      case 'free-item':
        return 'Free Item';
      case 'loyalty-points':
        return `${value} Loyalty Points`;
      default:
        return 'Reward';
    }
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            {getRewardIcon(rule.rewardType)}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">
              {getRewardTitle(rule.rewardType, rule.rewardValue)}
            </h4>
            <p className="text-sm text-muted-foreground">
              {getRewardDescription(rule)}
            </p>
            {rule.validityDays && (
              <p className="text-xs text-muted-foreground mt-2">
                Valid for {rule.validityDays} days after earning
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Generate metadata
 */
export const metadata = {
  title: 'My Rewards - Wawa Garden Bar',
  description: 'View and manage your rewards',
};
