'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  toggleMenuItemAvailabilityAction,
  deleteMenuItemAction,
  uploadMenuImageAction,
} from '@/app/actions/admin/menu-actions';

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  mainCategory: string;
  category: string;
  price: number;
  preparationTime: number;
  isAvailable: boolean;
  tags: string[];
  images: string[];
}

interface MenuItemsTableProps {
  menuItems: MenuItem[];
}

/**
 * Menu items table with actions
 */
export function MenuItemsTable({ menuItems }: MenuItemsTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  async function handleToggleAvailability(id: string) {
    try {
      setLoading(true);
      const result = await toggleMenuItemAvailabilityAction(id);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to toggle availability',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) return;

    try {
      setLoading(true);
      const result = await deleteMenuItemAction(selectedItem._id);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setDeleteDialogOpen(false);
        setSelectedItem(null);
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
      setLoading(false);
    }
  }

  async function handleUploadImage() {
    if (!selectedItem || !uploadFile) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', uploadFile);

      const result = await uploadMenuImageAction(selectedItem._id, formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setUploadDialogOpen(false);
        setSelectedItem(null);
        setUploadFile(null);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to upload image',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function getCategoryBadgeColor(
    mainCategory: string
  ): 'default' | 'secondary' {
    // REQ-075 — Two-tone palette only handles the legacy seed pair.
    // Per-category colour metadata is a future REQ; until then anything
    // outside `food` reads as secondary.
    return mainCategory === 'food' ? 'default' : 'secondary';
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Prep Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No menu items found
                  </TableCell>
                </TableRow>
              ) : (
                menuItems.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      {item.images.length > 0 ? (
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={getCategoryBadgeColor(item.mainCategory)}
                        >
                          {item.mainCategory}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ₦{item.price.toLocaleString()}
                    </TableCell>
                    <TableCell>{item.preparationTime} min</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.isAvailable ? 'default' : 'secondary'}
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/menu/${item._id}/edit`)
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedItem(item);
                              setUploadDialogOpen(true);
                            }}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Image
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleAvailability(item._id)}
                            disabled={loading}
                          >
                            {item.isAvailable ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Mark Unavailable
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Mark Available
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedItem(item);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Image Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Upload an image for "{selectedItem?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image">Image File</Label>
              <Input
                id="image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Max file size: 5MB. Supported formats: JPEG, PNG, WebP
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadFile(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadImage}
              disabled={loading || !uploadFile}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
