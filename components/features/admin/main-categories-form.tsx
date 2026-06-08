'use client';

/**
 * REQ-075 — Main Categories admin form.
 *
 * Surfaces the configurable main-category registry (renamed, added,
 * disabled, deleted by admins). Talks to the server actions in
 * `app/dashboard/settings/actions.ts`. Sub-category management for each
 * main category continues to live in the sibling MenuCategoriesForm.
 *
 * Editing model is per-row:
 *
 *   - Inline label edit fires `updateMainCategoryAction({ label })`.
 *   - Enabled toggle fires `updateMainCategoryAction({ isEnabled })`.
 *   - "Rename slug" opens a prompt — uses
 *     `renameMainCategoryAction(oldSlug, newSlug)` which cascades to
 *     `MenuItem.mainCategory` + `IMenuSettings` keys server-side.
 *   - Delete is blocked server-side when references exist; the UI
 *     surfaces the reference count before allowing delete.
 *   - Reorder via up/down buttons fires
 *     `reorderMainCategoriesAction([slug, slug, …])`.
 *   - Adding a new main category fires `createMainCategoryAction`.
 *
 * @requirement REQ-075
 * @requirement SRS REQ-MENUMGT-005
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Save, GripVertical, Pencil } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  createMainCategoryAction,
  updateMainCategoryAction,
  renameMainCategoryAction,
  reorderMainCategoriesAction,
  deleteMainCategoryAction,
  getMainCategoryReferenceCountAction,
} from '@/app/dashboard/settings/actions';
import type { IMainCategoryConfig } from '@/interfaces/main-category.interface';

interface MainCategoriesFormProps {
  initialCategories: IMainCategoryConfig[];
}

export function MainCategoriesForm({
  initialCategories,
}: MainCategoriesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftLabel, setDraftLabel] = useState('');
  const [draftIcon, setDraftIcon] = useState('');
  const [draftPortions, setDraftPortions] = useState(false);

  const sorted = [...initialCategories].sort((a, b) => a.order - b.order);

  function refresh() {
    router.refresh();
  }

  function handleCreate() {
    const label = draftLabel.trim();
    if (!label) {
      toast({
        title: 'Label required',
        description: 'Enter a label before adding a main category.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const result = await createMainCategoryAction({
        label,
        icon: draftIcon.trim() || undefined,
        portionsEnabled: draftPortions || undefined,
      });
      if (result.success) {
        toast({
          title: 'Main category created',
          description: `Added "${label}".`,
        });
        setDraftLabel('');
        setDraftIcon('');
        setDraftPortions(false);
        refresh();
      } else {
        toast({
          title: 'Failed to add',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  function handleUpdate(
    slug: string,
    patch: Parameters<typeof updateMainCategoryAction>[1],
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await updateMainCategoryAction(slug, patch);
      if (result.success) {
        toast({ title: successMessage });
        refresh();
      } else {
        toast({
          title: 'Update failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  function handleRename(slug: string) {
    const newSlug = window
      .prompt(
        `Rename slug for "${slug}".\n\nThis updates every MenuItem.mainCategory and ` +
          `relocates its sub-categories. Slugs are lowercase a-z, digits, and hyphens, ` +
          `max 32 chars.`,
        slug
      )
      ?.trim()
      .toLowerCase();
    if (!newSlug || newSlug === slug) return;

    startTransition(async () => {
      const result = await renameMainCategoryAction(slug, newSlug);
      if (result.success) {
        toast({
          title: 'Renamed',
          description: `"${slug}" → "${newSlug}".`,
        });
        refresh();
      } else {
        toast({
          title: 'Rename failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  function handleReorder(slug: string, direction: -1 | 1) {
    const idx = sorted.findIndex((c) => c.slug === slug);
    const swapWith = idx + direction;
    if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return;

    const slugs = sorted.map((c) => c.slug);
    [slugs[idx], slugs[swapWith]] = [slugs[swapWith], slugs[idx]];

    startTransition(async () => {
      const result = await reorderMainCategoriesAction(slugs);
      if (result.success) {
        refresh();
      } else {
        toast({
          title: 'Reorder failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  function handleDelete(slug: string) {
    startTransition(async () => {
      const refs = await getMainCategoryReferenceCountAction(slug);
      if (!refs.success || !refs.data) {
        toast({
          title: 'Cannot read counts',
          description: refs.error,
          variant: 'destructive',
        });
        return;
      }

      const { menuItems, subCategories } = refs.data;
      if (menuItems > 0 || subCategories > 0) {
        toast({
          title: 'Delete blocked',
          description: `${menuItems} menu items + ${subCategories} sub-categories reference "${slug}". Move them, or disable instead.`,
          variant: 'destructive',
        });
        return;
      }

      if (
        !window.confirm(
          `Delete main category "${slug}"? This cannot be undone.`
        )
      ) {
        return;
      }

      const result = await deleteMainCategoryAction(slug);
      if (result.success) {
        toast({ title: 'Deleted', description: `Removed "${slug}".` });
        refresh();
      } else {
        toast({
          title: 'Delete failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Card data-testid="main-categories-form">
      <CardHeader>
        <CardTitle>Main Categories</CardTitle>
        <CardDescription>
          Top-level menu sections (e.g. Food, Drinks). Rename, reorder, disable,
          or delete. Delete is blocked when any menu item or sub-category still
          references the main category.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {sorted.map((cat, index) => (
            <MainCategoryRow
              key={cat.slug}
              cat={cat}
              isFirst={index === 0}
              isLast={index === sorted.length - 1}
              isPending={isPending}
              onUpdate={handleUpdate}
              onRename={handleRename}
              onReorder={handleReorder}
              onDelete={handleDelete}
            />
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No main categories yet — add one below.
            </p>
          )}
        </div>

        <div className="rounded-md border border-dashed p-4 space-y-3">
          <div className="text-sm font-medium">Add a new main category</div>
          <div className="grid gap-3 md:grid-cols-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="new-main-label">Label</Label>
              <Input
                id="new-main-label"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="e.g. Snacks"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-main-icon">Icon (emoji)</Label>
              <Input
                id="new-main-icon"
                value={draftIcon}
                onChange={(e) => setDraftIcon(e.target.value)}
                placeholder="🍿"
                disabled={isPending}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="new-main-portions"
                checked={draftPortions}
                onCheckedChange={setDraftPortions}
                disabled={isPending}
              />
              <Label
                htmlFor="new-main-portions"
                className="text-xs font-normal text-muted-foreground"
              >
                Portions enabled
              </Label>
            </div>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !draftLabel.trim()}
              data-testid="add-main-category"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MainCategoryRow({
  cat,
  isFirst,
  isLast,
  isPending,
  onUpdate,
  onRename,
  onReorder,
  onDelete,
}: {
  cat: IMainCategoryConfig;
  isFirst: boolean;
  isLast: boolean;
  isPending: boolean;
  onUpdate: (
    slug: string,
    patch: {
      label?: string;
      isEnabled?: boolean;
      icon?: string;
      portionsEnabled?: boolean;
    },
    successMessage: string
  ) => void;
  onRename: (slug: string) => void;
  onReorder: (slug: string, direction: -1 | 1) => void;
  onDelete: (slug: string) => void;
}) {
  const [labelDraft, setLabelDraft] = useState(cat.label);
  const labelChanged = labelDraft.trim() !== cat.label;

  return (
    <div
      className="flex items-center gap-4 rounded-md border p-4 bg-card"
      data-testid={`main-category-row-${cat.slug}`}
    >
      <div className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="grid flex-1 gap-4 md:grid-cols-5 items-center">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Slug</Label>
          <div className="font-mono text-sm flex items-center gap-2">
            {cat.slug}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRename(cat.slug)}
              disabled={isPending}
              title="Rename slug"
              data-testid={`rename-${cat.slug}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label
            htmlFor={`label-${cat.slug}`}
            className="text-xs text-muted-foreground"
          >
            Label
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`label-${cat.slug}`}
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              disabled={isPending}
              data-testid={`label-input-${cat.slug}`}
            />
            {labelChanged && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  onUpdate(
                    cat.slug,
                    { label: labelDraft.trim() },
                    `Label updated for "${cat.slug}"`
                  )
                }
                disabled={isPending || !labelDraft.trim()}
                title="Save label"
                data-testid={`save-label-${cat.slug}`}
              >
                <Save className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={cat.isEnabled}
            onCheckedChange={(checked) =>
              onUpdate(
                cat.slug,
                { isEnabled: checked },
                `${cat.label} ${checked ? 'enabled' : 'disabled'}`
              )
            }
            disabled={isPending}
            data-testid={`enable-toggle-${cat.slug}`}
          />
          <Label className="text-xs font-normal text-muted-foreground">
            {cat.isEnabled ? 'Visible' : 'Hidden'}
          </Label>
        </div>

        {/* REQ-075 — Portions toggle controls whether the Add / Edit
            Menu Item forms surface the Half / Quarter portion section
            for items under this main category. Customer-facing pages
            honour the item's stored portionOptions flags regardless,
            so toggling this off doesn't strip portions from existing
            items — only hides the form section for new edits. */}
        <div className="flex items-center gap-2">
          <Switch
            checked={cat.portionsEnabled === true}
            onCheckedChange={(checked) =>
              onUpdate(
                cat.slug,
                { portionsEnabled: checked },
                `Portions ${checked ? 'enabled' : 'disabled'} for "${cat.label}"`
              )
            }
            disabled={isPending}
            data-testid={`portions-toggle-${cat.slug}`}
          />
          <Label className="text-xs font-normal text-muted-foreground">
            {cat.portionsEnabled === true ? 'Portions on' : 'Portions off'}
          </Label>
        </div>

        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onReorder(cat.slug, -1)}
            disabled={isPending || isFirst}
            title="Move Up"
          >
            <span className="text-lg">↑</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onReorder(cat.slug, 1)}
            disabled={isPending || isLast}
            title="Move Down"
          >
            <span className="text-lg">↓</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/90"
            onClick={() => onDelete(cat.slug)}
            disabled={isPending}
            title="Delete"
            data-testid={`delete-${cat.slug}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
