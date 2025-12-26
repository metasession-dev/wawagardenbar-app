'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MenuItemWithStock } from '@/services/category-service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle } from 'lucide-react';
import { MenuItemDetailModal } from './menu-item-detail-modal';

interface MenuItemProps {
  item: MenuItemWithStock;
}

export function MenuItem({ item }: MenuItemProps) {
  const [showDetail, setShowDetail] = useState(false);

  const isOutOfStock = item.stockStatus === 'out-of-stock';
  const isLowStock = item.stockStatus === 'low-stock';

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  }

  return (
    <>
      <Card
        className={`group cursor-pointer transition-all hover:shadow-lg ${
          isOutOfStock ? 'opacity-60' : ''
        }`}
        data-testid={`menu-item-${item.slug ?? item._id}`}
        onClick={() => !isOutOfStock && setShowDetail(true)}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          {item.images && item.images.length > 0 ? (
            <Image
              src={item.images[0]}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
              priority={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <span className="text-6xl">{item.mainCategory === 'drinks' ? '🥤' : '🍽️'}</span>
            </div>
          )}

          {/* Stock Status Badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Badge variant="destructive" className="text-lg">
                Out of Stock
              </Badge>
            </div>
          )}
          {isLowStock && !isOutOfStock && (
            <Badge variant="secondary" className="absolute right-2 top-2">
              <AlertCircle className="mr-1 h-3 w-3" />
              Low Stock
            </Badge>
          )}
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-lg">{item.name}</CardTitle>
            <Badge variant="outline" className="shrink-0">
              {item.mainCategory === 'food' && item.halfPortionEnabled
                ? `from ${formatPrice(Math.round(item.price * 0.5))}`
                : formatPrice(item.price)}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">{item.description}</CardDescription>
        </CardHeader>

        <CardContent className="pb-3">
          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Allergens Warning */}
          {item.allergens && item.allergens.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              <AlertCircle className="mr-1 inline h-3 w-3" />
              Contains: {item.allergens.join(', ')}
            </p>
          )}
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              setShowDetail(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </CardFooter>
      </Card>

      {/* Detail Modal */}
      <MenuItemDetailModal
        item={item}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}
