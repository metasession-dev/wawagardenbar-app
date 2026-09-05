'use client';

/**
 * REQ-102 — bulk "Edit All" menu items table.
 *
 * Per-row draft-state + conditional save button, mirroring the inline-edit
 * convention in `main-categories-form.tsx`'s `MainCategoryRow`: a row's
 * "Save" affordance appears only when its draft differs from the persisted
 * values, and the availability `Switch` saves immediately on toggle (no
 * separate save step) — same as that file's enabled toggles.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  updateMenuItemRowAction,
  toggleMenuItemAvailabilityAction,
} from '@/app/actions/admin/menu-actions';
import type { IMainCategoryConfig } from '@/interfaces/main-category.interface';
import type { IMenuSettings } from '@/interfaces/menu-settings.interface';

export interface EditAllMenuItemRow {
  _id: string;
  name: string;
  mainCategory: string;
  category: string;
  costPerUnit: number;
  price: number;
  showPrice: number;
  happyHourPrice: number;
  isAvailable: boolean;
}

interface MenuEditAllTableProps {
  items: EditAllMenuItemRow[];
  mainCategories: IMainCategoryConfig[];
  availableCategories: IMenuSettings;
}

export function MenuEditAllTable({
  items,
  mainCategories,
  availableCategories,
}: MenuEditAllTableProps) {
  const router = useRouter();
  const [filterMain, setFilterMain] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categoriesForFilter = useMemo(() => {
    if (filterMain === 'all') return [];
    return (availableCategories[filterMain] ?? [])
      .filter((c) => c.isEnabled)
      .sort((a, b) => a.order - b.order);
  }, [filterMain, availableCategories]);

  const visibleItems = items.filter((item) => {
    if (filterMain !== 'all' && item.mainCategory !== filterMain) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory)
      return false;
    return true;
  });

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Main Category</label>
          <Select
            value={filterMain}
            onValueChange={(value) => {
              setFilterMain(value);
              setFilterCategory('all');
            }}
          >
            <SelectTrigger
              className="w-[200px]"
              data-testid="edit-all-filter-main-category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All main categories</SelectItem>
              {mainCategories.map((m) => (
                <SelectItem key={m.slug} value={m.slug}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Category</label>
          <Select
            value={filterCategory}
            onValueChange={setFilterCategory}
            disabled={filterMain === 'all'}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoriesForFilter.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Name</TableHead>
              <TableHead className="min-w-[160px]">Main Category</TableHead>
              <TableHead className="min-w-[160px]">Category</TableHead>
              <TableHead className="min-w-[110px]">Cost Price</TableHead>
              <TableHead className="min-w-[110px]">Default Price</TableHead>
              <TableHead className="min-w-[110px]">Show Price</TableHead>
              <TableHead className="min-w-[130px]">Happy Hour Price</TableHead>
              <TableHead className="min-w-[90px]">Available</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => (
              <MenuEditAllRow
                key={item._id}
                item={item}
                mainCategories={mainCategories}
                availableCategories={availableCategories}
                onSaved={refresh}
              />
            ))}
            {visibleItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No menu items match the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MenuEditAllRow({
  item,
  mainCategories,
  availableCategories,
  onSaved,
}: {
  item: EditAllMenuItemRow;
  mainCategories: IMainCategoryConfig[];
  availableCategories: IMenuSettings;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    name: item.name,
    mainCategory: item.mainCategory,
    category: item.category,
    costPerUnit: item.costPerUnit.toString(),
    price: item.price.toString(),
    showPrice: item.showPrice.toString(),
    happyHourPrice: item.happyHourPrice.toString(),
  });
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);

  const categoriesForRow = (availableCategories[draft.mainCategory] ?? [])
    .filter((c) => c.isEnabled)
    .sort((a, b) => a.order - b.order);

  const hasChanges =
    draft.name.trim() !== item.name ||
    draft.mainCategory !== item.mainCategory ||
    draft.category !== item.category ||
    parseFloat(draft.costPerUnit) !== item.costPerUnit ||
    parseFloat(draft.price) !== item.price ||
    parseFloat(draft.showPrice) !== item.showPrice ||
    parseFloat(draft.happyHourPrice) !== item.happyHourPrice;

  function handleSave() {
    const costPerUnit = parseFloat(draft.costPerUnit);
    const price = parseFloat(draft.price);
    const showPrice = parseFloat(draft.showPrice);
    const happyHourPrice = parseFloat(draft.happyHourPrice);

    if (!draft.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!draft.category) {
      toast({ title: 'Category is required', variant: 'destructive' });
      return;
    }
    if (
      [costPerUnit, price, showPrice, happyHourPrice].some(
        (n) => isNaN(n) || n < 0
      )
    ) {
      toast({
        title: 'Prices must be positive numbers',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const result = await updateMenuItemRowAction({
        menuItemId: item._id,
        name: draft.name.trim(),
        mainCategory: draft.mainCategory,
        category: draft.category,
        costPerUnit,
        price,
        showPrice,
        happyHourPrice,
      });

      if (result.success) {
        toast({ title: `"${draft.name.trim()}" updated` });
        onSaved();
      } else {
        toast({
          title: 'Failed to update item',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  function handleToggleAvailability(checked: boolean) {
    setIsAvailable(checked);
    startTransition(async () => {
      const result = await toggleMenuItemAvailabilityAction(item._id);
      if (!result.success) {
        setIsAvailable(!checked);
        toast({
          title: 'Failed to update availability',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        onSaved();
      }
    });
  }

  return (
    <TableRow data-testid={`edit-all-row-${item._id}`}>
      <TableCell>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          disabled={isPending}
          data-testid={`edit-all-name-${item._id}`}
        />
      </TableCell>
      <TableCell>
        <Select
          value={draft.mainCategory}
          onValueChange={(value) =>
            setDraft({ ...draft, mainCategory: value, category: '' })
          }
          disabled={isPending}
        >
          <SelectTrigger data-testid={`edit-all-main-category-${item._id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mainCategories.map((m) => (
              <SelectItem key={m.slug} value={m.slug}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={draft.category}
          onValueChange={(value) => setDraft({ ...draft, category: value })}
          disabled={isPending}
        >
          <SelectTrigger data-testid={`edit-all-category-${item._id}`}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categoriesForRow.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={draft.costPerUnit}
          onChange={(e) => setDraft({ ...draft, costPerUnit: e.target.value })}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={draft.showPrice}
          onChange={(e) => setDraft({ ...draft, showPrice: e.target.value })}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={draft.happyHourPrice}
          onChange={(e) =>
            setDraft({ ...draft, happyHourPrice: e.target.value })
          }
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={isAvailable}
          onCheckedChange={handleToggleAvailability}
          disabled={isPending}
          data-testid={`edit-all-available-${item._id}`}
        />
      </TableCell>
      <TableCell>
        {hasChanges && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleSave}
            disabled={isPending}
            title="Save"
            data-testid={`edit-all-save-${item._id}`}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
