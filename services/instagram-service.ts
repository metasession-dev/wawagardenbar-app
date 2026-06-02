import { Types } from 'mongoose';
import UserModel from '@/models/user-model';
import RewardRuleModel from '@/models/reward-rule-model';
import InstagramPostCreditModel from '@/models/instagram-post-credit-model';
import { RewardsService } from './rewards-service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @requirement REQ-059 — InstagramPostCredit sliding-window ledger.
 *
 * Per-post ledger decision: dedup (ledger first, legacy fallback during
 * the transition period), insert pending credit if new, count pending
 * credits within the rule's rolling `windowDays`, fire award + flip
 * pending→awarded when the threshold is reached. Race-safe via the unique
 * `postId` index on `InstagramPostCredit`.
 *
 * Exposed as a static method (rather than inline in `processRule`) so the
 * ledger logic is directly testable without mocking the Graph API path.
 */
export interface ProcessQualifyingPostArgs {
  user: { _id: Types.ObjectId };
  rule: {
    _id: Types.ObjectId;
    socialConfig: {
      hashtag?: string;
      postsRequired?: number;
      windowDays?: number;
      pointsAwarded?: number;
    };
  };
  post: { id: string; timestamp: string };
}

export type ProcessQualifyingPostAction =
  | 'skipped_already_seen'
  | 'inserted_legacy_fallback'
  | 'inserted_pending'
  | 'awarded'
  | 'award_failed';

/**
 * Service to handle Instagram API integration and reward processing
 */
export class InstagramService {
  private static readonly INSTAGRAM_API_BASE = 'https://graph.instagram.com';
  // Note: These tokens would typically be stored in environment variables or a secure vault
  // For the purpose of this implementation, we'll assume they are available via process.env
  private static readonly ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
  private static readonly BUSINESS_ACCOUNT_ID =
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  /**
   * Process Instagram rewards for all active campaigns
   * This is intended to be run as a scheduled job (e.g., hourly/daily)
   */
  static async processInstagramRewards() {
    try {
      console.log('Starting Instagram rewards processing...');

      // 1. Fetch active Instagram reward rules
      const activeRules = await RewardRuleModel.find({
        isActive: true,
        triggerType: 'social_instagram',
        'socialConfig.platform': 'instagram',
      }).exec();

      // Filter by date validity manually if needed
      const validRules = activeRules.filter((rule) =>
        (rule as any).isCurrentlyActive()
      );

      if (validRules.length === 0) {
        console.log('No active Instagram reward campaigns found.');
        return;
      }

      console.log(`Found ${validRules.length} active Instagram campaigns.`);

      for (const rule of validRules) {
        await this.processRule(rule);
      }

      console.log('Instagram rewards processing completed.');
    } catch (error) {
      console.error('Error processing Instagram rewards:', error);
      throw error;
    }
  }

  /**
   * Process a single Instagram reward rule
   */
  private static async processRule(rule: any) {
    if (!rule.socialConfig || !rule.socialConfig.hashtag) return;

    const hashtag = rule.socialConfig.hashtag.replace('#', '');
    console.log(`Processing campaign: ${rule.name} for hashtag #${hashtag}`);

    try {
      // 2. Get Hashtag ID
      const hashtagId = await this.getHashtagId(hashtag);
      if (!hashtagId) {
        console.warn(`Could not find ID for hashtag #${hashtag}`);
        return;
      }

      // 3. Get Recent Media for Hashtag
      const recentMedia = await this.getRecentMedia(hashtagId);

      // 4. Match Posts to Users and Validate
      for (const post of recentMedia) {
        // Skip if post doesn't have required fields
        if (!post.username || !post.timestamp) continue;

        // Check if post is within campaign dates
        const postDate = new Date(post.timestamp);

        // Use campaignDates if available, else legacy start/end
        let isDateValid = false;
        if (rule.campaignDates && rule.campaignDates.length > 0) {
          isDateValid = rule.campaignDates.some(
            (range: any) => postDate >= range.from && postDate <= range.to
          );
        } else {
          isDateValid = true;
          if (rule.startDate && postDate < rule.startDate) isDateValid = false;
          if (rule.endDate && postDate > rule.endDate) isDateValid = false;
        }

        if (!isDateValid) continue;

        // Check engagement criteria (Views/Impressions)
        // Note: Public API returns limited metrics. Sometimes we might need to rely on 'like_count' or 'comments_count' as proxy if 'views' unavailable for image posts.
        // For video/reels, 'media_type' would be VIDEO.
        // Assuming we can get some metric. For simplicity, we'll check likes/comments as API often restricts views on public hashtag search without advanced permissions.
        // If we strictly need views, we check appropriate fields.
        const engagement = (post.like_count || 0) + (post.comments_count || 0); // Simplified for MVP
        // OR if rule specifically asks for "views" and we assume we can get it (e.g. video views)
        // const views = post.media_type === 'VIDEO' ? post.like_count : 0; // Placeholder logic

        // Let's assume we map "views" requirement to "engagement" for now or assume we have access.
        if (engagement < (rule.socialConfig.minViews || 0)) continue;

        // 5. Find User
        // We need to find a user who has this instagram handle
        // We'll search case-insensitive
        // Case-insensitive exact match without regex — prevents injection from external usernames
        const user = await UserModel.findOne({
          'socialProfiles.instagram.handle': post.username,
        }).collation({ locale: 'en', strength: 2 });

        if (!user) continue;

        // 6. Check frequency limits (maxPostsPerPeriod)
        // This requires tracking history. For MVP, we might just check if they've already been rewarded for THIS post.
        // We'd need a way to track "RewardRedemption" linked to "externalId" (media_id).
        // Since we don't have a dedicated Redemption Log with metadata in the current schemas easily accessible here (Reward model tracks orderId),
        // we might need to assume we add points directly via PointsService and maybe log it there?
        // Or we use RewardsService.

        // For now, let's assume we check if we've already processed this media_id.
        // This requires a new collection or field to track processed posts.
        // For the sake of this implementation, we will skip the complex history check and assume
        // we have a method `hasProcessedPost(mediaId)` (stubbed).

        // REQ-059 — delegate per-post ledger decision (dedup → insert →
        // window-count → award). Replaces the old hasProcessedPost +
        // immediate-award flow with the sliding-window cadence model.
        await this.processQualifyingPost({
          user: { _id: user._id as Types.ObjectId },
          rule: {
            _id: rule._id as Types.ObjectId,
            socialConfig: rule.socialConfig,
          },
          post: { id: post.id, timestamp: post.timestamp },
        });
      }
    } catch (error) {
      console.error(`Error processing rule ${rule.name}:`, error);
    }
  }

  // --- API Helpers ---

  private static async getHashtagId(hashtag: string): Promise<string | null> {
    if (!this.ACCESS_TOKEN || !this.BUSINESS_ACCOUNT_ID) {
      // Mock for dev
      console.log('Missing Instagram Creds, returning mock ID');
      return 'mock_hashtag_id';
    }

    // https://graph.facebook.com/v18.0/ig_hashtag_search?user_id={user-id}&q={hashtag-name}&access_token={access-token}
    const url = `${this.INSTAGRAM_API_BASE}/ig_hashtag_search?user_id=${this.BUSINESS_ACCOUNT_ID}&q=${hashtag}&access_token=${this.ACCESS_TOKEN}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.data?.[0]?.id || null;
    } catch (e) {
      console.error('Instagram API Error:', e);
      return null;
    }
  }

  private static async getRecentMedia(hashtagId: string): Promise<any[]> {
    if (!this.ACCESS_TOKEN || !this.BUSINESS_ACCOUNT_ID) {
      // Mock data for development/testing when no credentials
      if (hashtagId === 'mock_hashtag_id') {
        return [
          {
            id: 'mock_media_1',
            username: 'wawagardenbar_fan', // Needs to match a user in DB for testing
            timestamp: new Date().toISOString(),
            media_type: 'IMAGE',
            like_count: 150,
            comments_count: 20,
          },
        ];
      }
      return [];
    }

    // https://graph.facebook.com/v18.0/{hashtag-id}/recent_media?user_id={user-id}&fields=id,media_type,comments_count,like_count,timestamp,username&access_token={access-token}
    const url = `${this.INSTAGRAM_API_BASE}/${hashtagId}/recent_media?user_id=${this.BUSINESS_ACCOUNT_ID}&fields=id,media_type,comments_count,like_count,timestamp,username,permalink&access_token=${this.ACCESS_TOKEN}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.error('Instagram API Error:', e);
      return [];
    }
  }

  // --- Persistence Helpers ---

  /**
   * REQ-059 AC3 — Legacy fallback dedup check. Pre-REQ-059, post-dedup
   * was a naive regex match against `PointsTransaction.description`.
   * REQ-059 promoted `InstagramPostCredit` to the primary dedup; this
   * method stays as the transition-period fallback for posts that were
   * awarded before the ledger landed. Retire after one full `windowDays`
   * cycle has run with the new ledger in place.
   */
  static async hasProcessedPost(mediaId: string): Promise<boolean> {
    const PointsTransactionModel = (
      await import('@/models/points-transaction-model')
    ).default;
    const exists = await PointsTransactionModel.findOne({
      description: { $regex: mediaId },
    });
    return !!exists;
  }

  /**
   * REQ-059 — Per-post ledger decision. See `ProcessQualifyingPostArgs`
   * docstring above for the orchestration shape. Returns the action tag
   * so callers (and tests) can branch on the outcome.
   */
  static async processQualifyingPost(
    args: ProcessQualifyingPostArgs
  ): Promise<{ action: ProcessQualifyingPostAction }> {
    const { user, rule, post } = args;
    const postedAt = new Date(post.timestamp);

    // 1. Primary dedup — InstagramPostCredit ledger.
    const ledgered = await InstagramPostCreditModel.exists({ postId: post.id });
    if (ledgered) {
      return { action: 'skipped_already_seen' };
    }

    // 2. Transition-period fallback — legacy description-regex dedup.
    // Posts awarded pre-REQ-059 have a PointsTransaction row but no
    // ledger row. Insert an `awarded` credit so future ticks treat the
    // post as fully accounted for; skip re-awarding.
    const inLegacy = await this.hasProcessedPost(post.id);
    if (inLegacy) {
      try {
        await InstagramPostCreditModel.create({
          userId: user._id,
          ruleId: rule._id,
          postId: post.id,
          postedAt,
          status: 'awarded',
          awardedAt: new Date(),
        });
      } catch (error) {
        // E11000 race with another tick — fine; the other tick won.
        if (
          !(error instanceof Error) ||
          (error as { code?: number }).code !== 11000
        ) {
          console.error(
            '[InstagramService] legacy-fallback credit insert failed:',
            error
          );
        }
      }
      return { action: 'inserted_legacy_fallback' };
    }

    // 3. New post — insert pending credit.
    try {
      await InstagramPostCreditModel.create({
        userId: user._id,
        ruleId: rule._id,
        postId: post.id,
        postedAt,
        status: 'pending',
      });
    } catch (error) {
      // Concurrent tick inserted the same postId first — treat as no-op.
      if (
        error instanceof Error &&
        (error as { code?: number }).code === 11000
      ) {
        return { action: 'skipped_already_seen' };
      }
      throw error;
    }

    // 4. Sliding-window count of pending credits for this (user, rule).
    const postsRequired = rule.socialConfig.postsRequired ?? 3;
    const windowDays = rule.socialConfig.windowDays ?? 7;
    const windowStart = new Date(Date.now() - windowDays * DAY_MS);
    const pendingCount = await InstagramPostCreditModel.countDocuments({
      userId: user._id,
      ruleId: rule._id,
      status: 'pending',
      postedAt: { $gte: windowStart },
    });

    if (pendingCount < postsRequired) {
      return { action: 'inserted_pending' };
    }

    // 5. Threshold reached — fire award + flip pending → awarded.
    const pointsAwarded = rule.socialConfig.pointsAwarded ?? 100;
    const hashtag = rule.socialConfig.hashtag ?? '';
    try {
      await RewardsService.awardSocialPoints(
        user._id.toString(),
        pointsAwarded,
        `Instagram Reward: cadence completion #${hashtag}`,
        post.id
      );
      await InstagramPostCreditModel.updateMany(
        {
          userId: user._id,
          ruleId: rule._id,
          status: 'pending',
          postedAt: { $gte: windowStart },
        },
        { $set: { status: 'awarded', awardedAt: new Date() } }
      );
      return { action: 'awarded' };
    } catch (error) {
      console.error(
        `[InstagramService] award failed for postId=${post.id}:`,
        error
      );
      return { action: 'award_failed' };
    }
  }
}
