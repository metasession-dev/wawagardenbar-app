'use client';

/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Editor for `IAdminPermissions.mainCategoryReportAccess`. Mounted in
 * `PermissionsManagementClient` below the existing `PermissionsEditor`
 * (which handles only boolean toggles).
 *
 * Three states the operator can persist:
 *   - "Unrestricted (all current + future mains)" ticked  → `undefined`
 *   - Unticked + 0 selected                               → `[]`
 *   - Unticked + ≥1 selected                              → `['food', ...]`
 *
 * Super-admin always bypasses this field at runtime; this editor isn't
 * shown for super-admin users (the page redirects them away anyway).
 */
import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle } from 'lucide-react';

interface MainCategoryOption {
  slug: string;
  label: string;
}

interface MainCategoryReportAccessEditorProps {
  value: string[] | undefined | null;
  onChange: (next: string[] | undefined) => void;
  enabledMainCategories: MainCategoryOption[];
  disabled?: boolean;
}

export function MainCategoryReportAccessEditor({
  value,
  onChange,
  enabledMainCategories,
  disabled,
}: MainCategoryReportAccessEditorProps) {
  const isUnrestricted = value === undefined || value === null;
  const selectedSlugs = useMemo(
    () => (isUnrestricted ? [] : (value ?? [])),
    [isUnrestricted, value]
  );
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  function handleUnrestrictedToggle(checked: boolean) {
    if (checked) {
      onChange(undefined);
    } else {
      // Unticking moves from unrestricted to explicit list — start with
      // empty (deny-all). Operator can then tick specific mains.
      onChange([]);
    }
  }

  function handleSlugToggle(slug: string, checked: boolean) {
    if (isUnrestricted) {
      // Editing slugs implicitly switches off the unrestricted toggle.
      onChange(checked ? [slug] : []);
      return;
    }
    const next = new Set(selectedSet);
    if (checked) next.add(slug);
    else next.delete(slug);
    onChange(Array.from(next));
  }

  const stateLabel = isUnrestricted
    ? 'Unrestricted — sees all current + future mains'
    : selectedSlugs.length === 0
      ? 'No access — page redirects to dashboard'
      : `Restricted to ${selectedSlugs.length} main${selectedSlugs.length === 1 ? '' : 's'}`;

  return (
    <Card data-testid="main-category-report-access-editor">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <CardTitle className="text-base">
              Main-Category Report Access
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Controls which main categories appear in{' '}
              <code>/dashboard/reports/by-main-category</code>. Requires Reports
              &amp; Analytics enabled above.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Current state: <strong>{stateLabel}</strong>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="main-cat-access-unrestricted"
            checked={isUnrestricted}
            onCheckedChange={(v) => handleUnrestrictedToggle(v === true)}
            disabled={disabled}
            data-testid="unrestricted-checkbox"
          />
          <Label
            htmlFor="main-cat-access-unrestricted"
            className="text-sm font-normal cursor-pointer"
          >
            Unrestricted (all current + future mains)
          </Label>
        </div>

        <div className="space-y-2 pl-2 border-l-2 border-muted">
          <div className="text-xs text-muted-foreground">
            Or restrict to specific mains:
          </div>
          {enabledMainCategories.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No enabled main categories registered. Add one in{' '}
                <code>/dashboard/settings</code> first.
              </AlertDescription>
            </Alert>
          ) : (
            <div
              className="grid gap-2 sm:grid-cols-2"
              data-testid="main-category-checkboxes"
            >
              {enabledMainCategories.map((m) => (
                <div
                  key={m.slug}
                  className="flex items-center gap-2"
                  data-testid={`main-category-checkbox-${m.slug}`}
                >
                  <Checkbox
                    id={`main-cat-${m.slug}`}
                    checked={selectedSet.has(m.slug)}
                    onCheckedChange={(v) =>
                      handleSlugToggle(m.slug, v === true)
                    }
                    disabled={disabled || isUnrestricted}
                  />
                  <Label
                    htmlFor={`main-cat-${m.slug}`}
                    className={`text-sm font-normal cursor-pointer ${isUnrestricted ? 'text-muted-foreground' : ''}`}
                  >
                    {m.label}{' '}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({m.slug})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
