import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, OrderItem } from '../order.service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderList implements OnInit, OnDestroy {
  @Input() householdId!: string;
  @Input() memberId!: string;
  @Input() members: { id: string; name: string }[] = [];

  items: OrderItem[] = [];
  private sub: any = null;
  newItem = '';
  pendingItem = '';
  showPopup = false;

  constructor(private orders: OrderService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }
  ngOnDestroy() { if (this.sub) this.sub.unsubscribe(); }

  async load() {
    this.items = await this.orders.getItems(this.householdId);
    this.cdr.detectChanges();
    if (!this.sub) {
      this.sub = this.orders.subscribeToItems(this.householdId, async () => {
        this.items = await this.orders.getItems(this.householdId);
        this.cdr.detectChanges();
      });
    }
  }

  nameFor(id: string | null): string {
    if (!id) return '';
    const m = this.members.find(x => x.id === id);
    return m ? m.name : '';
  }

  startAdd() {
    if (!this.newItem.trim()) return;
    this.pendingItem = this.newItem.trim();
    this.showPopup = true;
  }
  async choose(category: 'personal' | 'common') {
    await this.orders.addItem(this.householdId, this.pendingItem, category, this.memberId);
    this.newItem = ''; this.pendingItem = ''; this.showPopup = false;
    this.cdr.detectChanges();
  }
  cancel() { this.showPopup = false; this.pendingItem = ''; }
  async order(item: OrderItem) { await this.orders.markOrdered(item.id); }
  async remove(item: OrderItem) { await this.orders.deleteItem(item.id); }
}