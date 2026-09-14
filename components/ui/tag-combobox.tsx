'use client';

/**
 * @requirement REQ-104
 *
 * A creatable, multi-select tag picker: pick from existing tags, or type a
 * name that doesn't exist yet to create it on the fly. Built on the
 * existing Popover primitive — no new dependency (`cmdk` isn't installed
 * and isn't needed for this scope).
 */
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface TagOption {
  id: string;
  name: string;
}

interface TagComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  availableTags: TagOption[];
  onCreateTag: (name: string) => Promise<TagOption>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TagCombobox({
  value,
  onChange,
  availableTags,
  onCreateTag,
  disabled,
  placeholder = 'Add tags…',
  className,
}: TagComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedTags = useMemo(
    () => availableTags.filter((t) => value.includes(t.id)),
    [availableTags, value]
  );

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableTags.filter((t) => !value.includes(t.id));
    return availableTags.filter(
      (t) => !value.includes(t.id) && t.name.toLowerCase().includes(q)
    );
  }, [availableTags, value, query]);

  const exactMatchExists = availableTags.some(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase()
  );

  function addTag(id: string) {
    onChange([...value, id]);
    setQuery('');
  }

  function removeTag(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const tag = await onCreateTag(name);
      onChange([...value, tag.id]);
      setQuery('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {selectedTags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="gap-1">
          {tag.name}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              {placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or create a tag…"
              className="mb-2 h-8"
            />
            <div className="max-h-48 overflow-y-auto">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag.id)}
                  className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {tag.name}
                </button>
              ))}
              {query.trim() !== '' && !exactMatchExists && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent disabled:opacity-50"
                >
                  {creating ? 'Creating…' : `Create "${query.trim()}"`}
                </button>
              )}
              {filteredTags.length === 0 &&
                query.trim() === '' &&
                availableTags.length === value.length && (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">
                    No more tags — type to create one.
                  </p>
                )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
