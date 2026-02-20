'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin } from 'lucide-react';

interface LocationBreakdownCardProps {
  locations: Array<{
    location: string;
    locationName?: string;
    currentStock: number;
    percentage: string;
  }>;
  totalStock: number;
  unit: string;
}

export function LocationBreakdownCard({
  locations,
  totalStock,
  unit,
}: LocationBreakdownCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Stock by Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No location data available</p>
        ) : (
          locations.map((loc) => (
            <div key={loc.location} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {loc.locationName || loc.location}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {loc.percentage}%
                  </Badge>
                </div>
                <span className="text-sm font-semibold">
                  {loc.currentStock} {unit}
                </span>
              </div>
              <Progress value={parseFloat(loc.percentage)} className="h-2" />
            </div>
          ))
        )}
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total Stock</span>
            <span className="font-bold text-lg">
              {totalStock} {unit}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
