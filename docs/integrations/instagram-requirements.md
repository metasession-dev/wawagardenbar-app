# Instagram Rewards Requirements

## Overview
The goal is to implement a social rewards feature that incentivizes customers to engage with the Wawa Garden Bar brand on Instagram. Users will be rewarded with loyalty points for posting content that includes specific brand hashtags and meets engagement criteria (views).

## Functional Requirements

### 1. User Profile Integration
*   **Link Instagram Account:** Users must be able to input and save their Instagram handle/username in their Wawa App profile.
*   **Validation:** System should ideally verify the handle exists (optional for MVP, but good for UX).

### 2. Instagram Integration
*   **Official API Usage:** The system must use the official Instagram API (Graph API or Basic Display API) to track user posts. Scrapers are explicitly prohibited.
*   **Post Tracking:**
    *   Identify posts made by linked users.
    *   Filter posts by a configured **Hashtag** (e.g., `#wawagardenbar`).
    *   Filter posts within a specific **Date Range** (Campaign duration).
*   **Metrics Tracking:**
    *   Retrieve engagement metrics for the posts, specifically **Views** (Impressions).

### 3. Reward Logic (The "Instagram Rewards Template")
*   **Campaign Configuration:** Admins can create reward campaigns based on an "Instagram Template".
*   **Configurable Parameters:**
    *   **Hashtag:** The specific tag to look for.
    *   **Minimum Views:** The minimum number of views/impressions required to qualify.
    *   **Post Frequency:** Maximum number of posts to count per period (e.g., max 3 posts count toward the reward).
    *   **Reward Value:** Number of loyalty points to award (e.g., 500 points).
    *   **Frequency Cap:** e.g., "Maximum 500 points per week".
*   **Point Distribution:** Points should be automatically credited to the user's loyalty balance when criteria are met.

### 4. Admin Dashboard
*   **Reward Management:**
    *   Ability to select "Instagram Engagement" as a template type when creating a reward.
    *   Input fields for Instagram-specific settings (Hashtag, Min Views, etc.).
*   **Verification:**
    *   Admins need to ensure the Meta App is verified for the correct use cases.

## Non-Functional Requirements
*   **Compliance:** Must adhere to Instagram/Meta Platform Terms and Developer Policies.
*   **Performance:** Polling or webhook processing should not degrade system performance.
*   **Security:** Securely store any API tokens or user social data.

## Prerequisites & Constraints
*   **Meta Business Verification:** The Wawa Garden Bar organization must be verified by Meta.
*   **App Verification:** The application must pass Meta's App Review process to access public content or user insights.
*   **Domain Verification:** `wawagardenbar.com` must be verified.
