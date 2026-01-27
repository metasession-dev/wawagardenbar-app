'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateTabNameAction } from '@/app/actions/tabs/tab-actions';

interface EditTabNameDialogProps {
  tabId: string;
  tabNumber: string;
  currentName?: string;
}

export function EditTabNameDialog({ tabId, tabNumber, currentName }: EditTabNameDialogProps) {
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState(currentName || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateTabNameAction(tabId, customName);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Tab name updated successfully',
        });
        setOpen(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update tab name',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Tab Name</DialogTitle>
            <DialogDescription>
              Set a custom name for Tab #{tabNumber}. Leave empty to use the default tab number.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="customName">Custom Name</Label>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={`Tab #${tabNumber}`}
              maxLength={50}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              This name will be displayed instead of the tab number.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
