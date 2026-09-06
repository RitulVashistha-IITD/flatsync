import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface OrderItem {
  id: string;
  name: string;
  category: 'personal' | 'common';
  status: 'needed' | 'ordered';
  added_by: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private sb: SupabaseService) {}

  // Load all items for a household (needed ones first, then ordered).
  async getItems(householdId: string): Promise<OrderItem[]> {
    const { data } = await this.sb.client
      .from('order_items')
      .select('id, name, category, status, added_by')
      .eq('household_id', householdId)
      .order('status')          // 'needed' sorts before 'ordered'
      .order('created_at');
    return (data as OrderItem[]) ?? [];
  }

  // Add a new item.
  async addItem(householdId: string, name: string, category: 'personal' | 'common', memberId: string) {
    const { error } = await this.sb.client
      .from('order_items')
      .insert({ household_id: householdId, name, category, added_by: memberId });
    if (error) throw error;
  }

  // Mark an item as ordered.
  async markOrdered(itemId: string) {
    const { error } = await this.sb.client
      .from('order_items')
      .update({ status: 'ordered', ordered_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) throw error;
  }

  // Remove an item entirely.
  async deleteItem(itemId: string) {
    await this.sb.client.from('order_items').delete().eq('id', itemId);
  }

  // Listen for any change to this household's items, in real time.
  subscribeToItems(householdId: string, onChange: () => void) {
    return this.sb.client
      .channel('orders-' + householdId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: 'household_id=eq.' + householdId },
        () => onChange()
      )
      .subscribe();
  }
}