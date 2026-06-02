/**
 * @requirement REQ-060 — Customer-facing Instagram campaign progress card
 *
 * Server component that renders one progress card per currently-active
 * social_instagram campaign for the signed-in customer. Reads from
 * REQ-059's InstagramPostCredit ledger via
 * `InstagramService.getActiveCampaignsForUser`.
 *
 * Empty state is silent — when `campaigns.length === 0` the component
 * renders `null` so customers without active IG campaigns see no card
 * at all (no "no active campaigns" clutter).
 */
import { Instagram } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { UserCampaignProgress } from '@/services/instagram-service';

interface InstagramCampaignCardProps {
  campaigns: UserCampaignProgress[];
}

export function InstagramCampaignCard({
  campaigns,
}: InstagramCampaignCardProps) {
  if (campaigns.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {campaigns.map((c) => {
        const percent = Math.min(
          100,
          Math.round((c.currentProgress / c.postsRequired) * 100)
        );
        const tagLabel = c.hashtag ? `#${c.hashtag}` : 'the bar';
        return (
          <Card key={c.ruleId} className="border-pink-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Instagram className="h-5 w-5 text-pink-500" />
                Earn {c.pointsAwarded} points on Instagram
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tag {tagLabel} {c.postsRequired} times in {c.windowDays} days
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={percent} />
              <p className="text-sm font-medium">
                Your progress: {c.currentProgress}/{c.postsRequired}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
