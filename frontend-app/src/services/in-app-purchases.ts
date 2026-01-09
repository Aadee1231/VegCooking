import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface PurchaseItem {
  productId: string;
  price: string;
  currency: string;
  localizedPrice: string;
  title: string;
  description: string;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
}

class InAppPurchaseService {
  private initialized = false;
  private items: Map<string, PurchaseItem> = new Map();
  private isDevelopmentBuild = false;

  // Product IDs matching the store configuration
  private readonly PRODUCT_IDS = [
    'flavur_support_coffee',
    'flavur_support_lunch', 
    'flavur_support_dinner',
    'flavur_support_groceries',
    'flavur_support_feast',
  ];

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if we're in Expo Go (no native modules available)
      // In Expo Go, we'll always use mock mode
      this.isDevelopmentBuild = false;
      
      // Set up mock items for demo mode
      this.setupMockItems();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize in-app purchases:', error);
      this.isDevelopmentBuild = false;
      this.initialized = true;
    }
  }

  private setupMockItems(): void {
    // Create mock items for display
    const mockItems = [
      {
        productId: 'flavur_support_coffee',
        price: '0.99',
        currency: 'USD',
        localizedPrice: '$0.99',
        title: 'Coffee Support',
        description: 'Buy me a coffee!',
      },
      {
        productId: 'flavur_support_lunch',
        price: '4.99',
        currency: 'USD',
        localizedPrice: '$4.99',
        title: 'Lunch Support',
        description: 'Fuel my creativity!',
      },
      {
        productId: 'flavur_support_dinner',
        price: '9.99',
        currency: 'USD',
        localizedPrice: '$9.99',
        title: 'Dinner Support',
        description: 'Keep me going!',
      },
      {
        productId: 'flavur_support_groceries',
        price: '19.99',
        currency: 'USD',
        localizedPrice: '$19.99',
        title: 'Groceries Support',
        description: 'Stock the kitchen!',
      },
      {
        productId: 'flavur_support_feast',
        price: '49.99',
        currency: 'USD',
        localizedPrice: '$49.99',
        title: 'Feast Support',
        description: 'Ultimate support!',
      },
    ];

    mockItems.forEach((item) => {
      this.items.set(item.productId, item);
    });
  }

  private async processSuccessfulPurchase(purchase: any): Promise<void> {
    try {
      // Get user info from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found for purchase processing');
        return;
      }

      // Store purchase in database
      const { error: dbError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          product_id: purchase.productId,
          transaction_id: purchase.transactionId || purchase.purchaseToken,
          purchase_token: purchase.purchaseToken,
          amount: this.getAmountFromProductId(purchase.productId),
          currency: 'USD',
          status: 'completed',
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Error storing purchase in database:', dbError);
      }

      // Send thank you email
      if (user.email) {
        await this.sendThankYouEmail(user.email, purchase.productId);
      }
    } catch (error) {
      console.error('Error processing successful purchase:', error);
    }
  }

  private getAmountFromProductId(productId: string): number {
    const amounts: Record<string, number> = {
      'flavur_support_coffee': 0.99,
      'flavur_support_lunch': 4.99,
      'flavur_support_dinner': 9.99,
      'flavur_support_groceries': 19.99,
      'flavur_support_feast': 49.99,
    };
    return amounts[productId] || 0;
  }

  private async sendThankYouEmail(email: string, productId: string): Promise<void> {
    try {
      // Call Supabase Edge Function to send thank you email
      const { error } = await supabase.functions.invoke('send-thank-you-email', {
        body: {
          email,
          productId,
          tierName: this.getTierName(productId),
        },
      });

      if (error) {
        console.error('Error sending thank you email:', error);
      }
    } catch (error) {
      console.error('Error invoking email function:', error);
    }
  }

  private getTierName(productId: string): string {
    const tierNames: Record<string, string> = {
      'flavur_support_coffee': 'Coffee',
      'flavur_support_lunch': 'Lunch',
      'flavur_support_dinner': 'Dinner',
      'flavur_support_groceries': 'Groceries',
      'flavur_support_feast': 'Feast',
    };
    return tierNames[productId] || 'Support';
  }

  async purchaseItem(productId: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const item = this.items.get(productId);
      if (!item) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful purchase
      const mockPurchase = {
        productId,
        transactionId: `mock_${Date.now()}`,
        purchaseToken: `mock_token_${Date.now()}`,
      };
      
      // Process the mock purchase
      await this.processSuccessfulPurchase(mockPurchase);
      
      return {
        success: true,
        productId: productId,
        transactionId: mockPurchase.transactionId,
      };
    } catch (error) {
      console.error('Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown purchase error',
      };
    }
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return [{
        success: false,
        error: 'Restore not available in demo mode',
      }];
    } catch (error) {
      console.error('Restore purchases error:', error);
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Unknown restore error',
      }];
    }
  }

  getAvailableItems(): PurchaseItem[] {
    return Array.from(this.items.values());
  }

  getItemPrice(productId: string): string {
    const item = this.items.get(productId);
    return item?.localizedPrice || '$0.00';
  }

  async disconnect(): Promise<void> {
    try {
      this.initialized = false;
    } catch (error) {
      console.error('Error disconnecting from in-app purchases:', error);
    }
  }

  // Helper method to check if purchases are available
  isPurchasesAvailable(): boolean {
    return false; // Always false in demo mode
  }
}

export const inAppPurchaseService = new InAppPurchaseService();
