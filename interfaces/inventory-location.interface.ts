export interface IInventoryLocationConfig {
  id: string;
  name: string;
  type: 'storage' | 'chiller' | 'other';
  isActive: boolean;
  description?: string;
  capacity?: number;
  displayOrder: number;
}

export interface IInventoryLocationsSettings {
  enabled: boolean;
  locations: IInventoryLocationConfig[];
  defaultReceivingLocation: string;
  defaultSalesLocation: string;
  requireTransferNotes: boolean;
  allowNegativeStock: boolean;
}
