'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteMenuItemAction } from '@/app/actions/admin/menu-actions';
import { Loader2 } from 'lucide-react';

interface DeleteMenuItemDialogProps {
  menuItemId: string;
  menuItemName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Delete menu item confirmation dialog
 */
export function DeleteMenuItemDialog({
  menuItemId,
  menuItemName,
  open,
  onOpenChange,
}: DeleteMenuItemDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteMenuItemAction(menuItemId);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Menu item deleted successfully',
        });
        router.push('/dashboard/menu');
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete menu item',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      onOpenChange(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{menuItemName}"? This action cannot
            be undone. This will also remove any associated inventory records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
