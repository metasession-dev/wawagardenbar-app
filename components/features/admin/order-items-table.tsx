'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart } from 'lucide-react';

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
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.portionSize === 'half' && (
                            <Badge variant="secondary" className="text-xs">Half Portion</Badge>
                          )}
                          {item.portionSize === 'quarter' && (
                            <Badge variant="secondary" className="text-xs">Quarter Portion</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ₦{item.price.toLocaleString()} × {item.quantity}
                        </p>
                        
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
