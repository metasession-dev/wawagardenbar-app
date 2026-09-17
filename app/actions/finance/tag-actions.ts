'use server';

/**
 * @requirement REQ-104 - Expense tags: create, archive, attach, filter
 *
 * Server actions for the expense tag registry.
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { TagService } from '@/services/tag-service';

async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

function requireAdminOrAbove(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (session.role !== 'admin' && session.role !== 'super-admin') {
    throw new Error('Insufficient permissions');
  }
}

/**
 * Create a tag, or return the existing (unarchiving if needed) tag with
 * the same case-insensitive name. Available to: admin, super-admin.
 */
export async function createTagAction(name: string) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const tag = await TagService.createTag({
      name,
      createdBy: session.userId!,
    });
    revalidatePath('/dashboard/finance/expenses');
    return { success: true, tag: JSON.parse(JSON.stringify(tag)) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tag',
    };
  }
}

/**
 * List active (non-archived) tags — for the create-combobox and filter.
 * Available to: admin, super-admin.
 */
export async function listActiveTagsAction() {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const tags = await TagService.listActiveTags();
    return { success: true, tags: JSON.parse(JSON.stringify(tags)) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list tags',
      tags: [],
    };
  }
}

/**
 * List all tags, including archived — for the tag management view.
 * Available to: admin, super-admin.
 */
export async function listAllTagsAction() {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const tags = await TagService.listAllTags();
    return { success: true, tags: JSON.parse(JSON.stringify(tags)) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list tags',
      tags: [],
    };
  }
}

/**
 * Archive a tag so it no longer appears in the create-combobox. Existing
 * references on pending/transferred expenses are unaffected.
 * Available to: admin, super-admin.
 */
export async function archiveTagAction(tagId: string) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    await TagService.archiveTag(tagId);
    revalidatePath('/dashboard/finance/expenses');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive tag',
    };
  }
}

/**
 * Restore an archived tag. Available to: admin, super-admin.
 */
export async function restoreTagAction(tagId: string) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    await TagService.restoreTag(tagId);
    revalidatePath('/dashboard/finance/expenses');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore tag',
    };
  }
}
