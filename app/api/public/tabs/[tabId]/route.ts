import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { TabService } from '@/services/tab-service';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  parseJsonBody,
  serialize,
} from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ tabId: string }>;
}

/**
 * GET /api/public/tabs/{tabId}
 *
 * Get a single tab by ID with populated orders.
 *
 * @authentication API Key required — scope: `tabs:read`
 * @ratelimit      30 requests / minute (moderate)
 * @pathParam {string} tabId - MongoDB ObjectId of the tab
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiAuth(request, ['tabs:read'], async () => {
    try {
      const { tabId } = await context.params;
      if (!Types.ObjectId.isValid(tabId)) {
        return apiError('Invalid tab ID', 400);
      }

      const details = await TabService.getTabDetails(tabId);
      return apiSuccess(serialize(details));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Tab not found';
      if (msg.includes('not found')) return apiError(msg, 404);
      console.error('[PUBLIC API] GET /api/public/tabs/[tabId]', error);
      return apiError(msg, 500);
    }
  });
}

/**
 * PATCH /api/public/tabs/{tabId}
 *
 * Update tab: rename, close (without payment), or add tip.
 *
 * @authentication API Key required — scope: `tabs:write`
 * @ratelimit      30 requests / minute (moderate)
 * @pathParam {string} tabId - MongoDB ObjectId of the tab
 *
 * @body {string} [action]      - "close" to close tab without payment
 * @body {string} [customName]  - Rename the tab / table label
 * @body {number} [tipAmount]   - Set tip amount (recalculates total)
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiAuth(request, ['tabs:write'], async () => {
    try {
      const { tabId } = await context.params;
      if (!Types.ObjectId.isValid(tabId)) {
        return apiError('Invalid tab ID', 400);
      }

      const body = await parseJsonBody<Record<string, unknown>>(request);
      if (!body) return apiError('Invalid JSON body', 400);

      const { action, customName, tipAmount } = body as {
        action?: string;
        customName?: string;
        tipAmount?: number;
      };

      // Close tab action
      if (action === 'close') {
        const tab = await TabService.closeTab(tabId);
        return apiSuccess(serialize(tab));
      }

      // Rename tab
      if (customName !== undefined) {
        const tab = await TabService.updateTabName(tabId, String(customName));
        return apiSuccess(serialize(tab));
      }

      // Set tip
      if (tipAmount !== undefined && typeof tipAmount === 'number') {
        if (tipAmount < 0) return apiError('tipAmount must be >= 0', 400);
        const result = await TabService.prepareTabForCheckout(tabId, tipAmount);
        return apiSuccess(serialize(result.tab));
      }

      return apiError('Provide action ("close"), customName, or tipAmount', 400);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update tab';
      if (msg.includes('not found')) return apiError(msg, 404);
      console.error('[PUBLIC API] PATCH /api/public/tabs/[tabId]', error);
      return apiError(msg, 500);
    }
  });
}

/**
 * DELETE /api/public/tabs/{tabId}
 *
 * Delete a tab. Tab must be open/unpaid and all orders must be cancelled.
 *
 * @authentication API Key required — scope: `tabs:write`
 * @ratelimit      30 requests / minute (moderate)
 * @pathParam {string} tabId - MongoDB ObjectId of the tab
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiAuth(request, ['tabs:write'], async () => {
    try {
      const { tabId } = await context.params;
      if (!Types.ObjectId.isValid(tabId)) {
        return apiError('Invalid tab ID', 400);
      }

      // Use a system identifier for the audit log since this is API key auth
      await TabService.deleteTab(tabId, 'api-system');
      return apiSuccess({ deleted: true, tabId });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete tab';
      if (msg.includes('not found')) return apiError(msg, 404);
      if (msg.includes('Cannot delete')) return apiError(msg, 422);
      console.error('[PUBLIC API] DELETE /api/public/tabs/[tabId]', error);
      return apiError(msg, 500);
    }
  });
}
