import { TabService } from '@/services/tab-service';
import { ITab } from '@/interfaces';

export interface TabRestrictionContext {
  userRole: 'admin' | 'super-admin' | 'customer';
  userId: string;
  customerId?: string;
  tableNumber?: string;
}

export interface TabRestrictionResult {
  isRestricted: boolean;
  existingTab: ITab | null;
  message?: string;
}

/**
 * Check if user is restricted by existing tabs
 * Admins are never restricted
 * Customers are restricted to one open tab
 */
export async function checkTabRestrictions(
  context: TabRestrictionContext
): Promise<TabRestrictionResult> {
  // Admins are never restricted
  if (context.userRole === 'admin' || context.userRole === 'super-admin') {
    // If admin is creating order for customer, check customer's tabs
    if (context.customerId) {
      const customerTab = await TabService.getOpenTabForCustomer(context.customerId);
      return {
        isRestricted: false,
        existingTab: customerTab,
        message: customerTab 
          ? `Customer has an open tab at Table ${customerTab.tableNumber}`
          : undefined,
      };
    }
    
    return {
      isRestricted: false,
      existingTab: null,
    };
  }
  
  // Customers are subject to restrictions
  if (context.userRole === 'customer') {
    const existingTab = await TabService.getOpenTabForUser(context.userId);
    
    if (existingTab) {
      return {
        isRestricted: true,
        existingTab,
        message: `You have an open tab at Table ${existingTab.tableNumber}`,
      };
    }
  }
  
  return {
    isRestricted: false,
    existingTab: null,
  };
}
