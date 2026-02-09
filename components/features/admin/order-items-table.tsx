'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, DollarSign } from 'lucide-react';

interface OrderItemsTableProps {
  order: any;
}

/**
 * Order items table component
 * Displays itemized list of order items with pricing
 */
export function OrderItemsTable({ order }: OrderItemsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Order Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Items List */}
          {order.items.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  {/* Item Image Placeholder */}
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {/* Item Name with Portion Size */}
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {(() => {
                              let quantityDisplay = `${item.quantity}x`;
                              if (item.portionSize === 'half') {
                                quantityDisplay = `${item.quantity} × 1/2x`;
                              } else if (item.portionSize === 'quarter') {
                                quantityDisplay = `${item.quantity} × 1/4x`;
                              }
                              return `${quantityDisplay} ${item.name}`;
                            })()}
                          </p>
                          {item.priceOverridden && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Price Overridden
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ₦{item.price.toLocaleString()} per portion
                        </p>
                        
                        {/* Price Override Details */}
                        {item.priceOverridden && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                            <div className="flex items-center gap-2 text-orange-700 font-medium">
                              <DollarSign className="h-3 w-3" />
                              <span>Price Override Details</span>
                            </div>
                            <div className="mt-1 space-y-1 text-muted-foreground">
                              {item.originalPrice && (
                                <>
                                  <div>Original: ₦{item.originalPrice.toLocaleString()}</div>
                                  <div>Override: ₦{item.price.toLocaleString()}</div>
                                  <div>
                                    Difference: {item.price > item.originalPrice ? '+' : ''}₦{(item.price - item.originalPrice).toLocaleString()}
                                  </div>
                                </>
                              )}
                              {item.priceOverrideReason && (
                                <div>Reason: {item.priceOverrideReason}</div>
                              )}
                              {item.priceOverriddenAt && (
                                <div>
                                  Overridden: {new Date(item.priceOverriddenAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Customizations */}
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.customizations.map((custom: any, idx: number) => (
                              <div key={idx}>
                                • {custom.name}: {custom.value}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <p className="font-medium whitespace-nowrap">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Separator />

          {/* Pricing Summary */}
          <div className="space-y-2">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₦{order.subtotal.toLocaleString()}</span>
            </div>

            {/* Tax */}
            {order.tax && order.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>₦{order.tax.toLocaleString()}</span>
              </div>
            )}

            {/* Delivery Fee */}
            {order.deliveryFee && order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>₦{order.deliveryFee.toLocaleString()}</span>
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>₦{order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
