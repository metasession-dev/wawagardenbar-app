# Instagram Rewards Implementation Details

## Architecture Overview
The solution will extend the existing Rewards System (`RewardService`) and User Profile (`User` model) to support social media based criteria. Interaction with Instagram will be handled via a dedicated service using the Instagram Graph API.

## 1. Database Schema Updates

### User Model (`User`)
Add a field to store the user's Instagram identity.
```typescript
interface IUser {
  // ... existing fields
  socialProfiles?: {
    instagram?: {
      handle: string;
      lastCheckedAt?: Date;
      verified?: boolean; // If we implement OAuth login later
    }
  }
}
```

### Reward Rule Model (`RewardRule`)
Extend the existing reward rule structure to support social criteria.
```typescript
interface IRewardRule {
  // ... existing fields
  type: 'points' | 'discount' | 'item';
  triggerType: 'transaction' | 'social_instagram'; // New discriminator
  
  // Instagram specific configuration (active when triggerType === 'social_instagram')
  socialConfig?: {
    platform: 'instagram';
    hashtag: string;
    minViews: number;
    maxPostsPerPeriod: number; // e.g., 3
    periodType: 'weekly' | 'monthly' | 'campaign_duration';
    pointsAwarded: number; // e.g., 500
  }
}
```

## 2. Instagram API Integration

### Prerequisites
*   **Meta App Setup:** 
    *   Create App in Meta Developers Console.
    *   Complete Business Verification for "Wawa Garden Bar".
    *   Request `instagram_basic` and `instagram_manage_insights` (or relevant) permissions.
    *   **Use Case:** Consumer/Business discovery.

### Service Layer (`InstagramService`)
A new service to handle API communication.
*   **Methods:**
    *   `verifyHandle(handle: string)`: Check if a user exists (if public API allows).
    *   `findHashtagId(hashtag: string)`: Get the ID for the target hashtag.
    *   `getRecentMedia(hashtagId: string)`: Search for recent media with the hashtag. *Note: Instagram API often requires "Instagram Login" to read user media. Alternatively, we can search for the hashtag and filter by the user's handle if the API permits "Hashtag Search" on behalf of a business account.*
    *   *Alternative Approach (Hashtag Search):* 
        1.  Use the Business Account's token to search for the Hashtag.
        2.  Iterate through results.
        3.  Match `media_owner` (username) against `User.socialProfiles.instagram.handle`.
        4.  Check `media_insights` (if available) for View/Impression count.

## 3. Backend Logic Flow

### User Configuration
1.  User goes to Profile Settings.
2.  Enters Instagram Handle (e.g., `@wawagardenbar_fan`).
3.  Backend saves to `User.socialProfiles.instagram.handle`.

### Engagement Checking (Cron Job / Scheduled Task)
Since we cannot rely on real-time webhooks for *every* user's public posts easily without them logging in via OAuth, a polling mechanism via the Business API Hashtag Search is likely required.

**Job: `ProcessInstagramRewards` (Runs e.g., Daily/Hourly)**
1.  Fetch active `RewardRules` where `triggerType === 'social_instagram'`.
2.  For each rule:
    *   Call `InstagramService.searchHashtag(rule.socialConfig.hashtag)`.
    *   Retrieve recent posts.
    *   Filter posts created within the campaign `startDate` and `endDate`.
3.  Match Posts to Users:
    *   Extract `username` from post.
    *   Find `User` in DB with matching `socialProfiles.instagram.handle`.
4.  Validate Criteria:
    *   Check if Post Views >= `rule.socialConfig.minViews`.
    *   Check if User has not exceeded `maxPostsPerPeriod`.
5.  Award Points:
    *   If eligible, call `RewardService.distributePoints(userId, points)`.
    *   Log the "Redemption" to prevent double counting (store `instagram_media_id` in a `RewardRedemption` log).

## 4. Dashboard Implementation

### Reward Rules Page (`/dashboard/rewards/rules`)
*   **Template Selection:** Add "Instagram Campaign" to the template dropdown.
*   **Form Fields:**
    *   Show fields for Hashtag input (e.g., `#summeratwawa`).
    *   Show input for "Minimum Views".
    *   Show input for "Points Reward".
*   **Validation:** Ensure hashtag starts with `#`.

## 5. Frontend (User App)

### Profile Page
*   Add input field for "Instagram Handle".
*   Add informational text: "Add your Instagram handle to be eligible for social rewards!"

### Rewards Page
*   Display the active Instagram Campaign card.
*   Show instructions: "Post a photo with **#wawagardenbar**, get 100+ views, and earn 500 points!"

## 6. Challenges & Mitigations
*   **API Limits:** Instagram Hashtag Search has rate limits. We may need to limit polling frequency.
*   **Data Privacy:** Only public posts can be tracked.
*   **Matching:** Users might change handles. We rely on the handle stored in our DB matching the post owner at the time of the check.
