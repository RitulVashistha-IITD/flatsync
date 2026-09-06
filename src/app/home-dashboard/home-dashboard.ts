import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HouseholdService } from '../household.service';
import { FeatureCard } from '../feature-card/feature-card';
import { OrderList } from '../order-list/order-list';
import { MealCalendar } from '../meal-calendar/meal-calendar';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, FeatureCard, OrderList, MealCalendar],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.css',
})
export class HomeDashboard implements OnInit, OnDestroy {
  identity: any = null;
  members: { id: string; name: string }[] = [];
  private sub: any = null;

  // which view we're on: the home grid, or a specific feature
  view: 'home' | 'orders' | 'meals' = 'home';

  constructor(private household: HouseholdService, private cdr: ChangeDetectorRef) {
    this.identity = this.household.getIdentity();
  }

  ngOnInit() { if (this.identity) this.loadMembers(); }
  ngOnDestroy() { if (this.sub) this.sub.unsubscribe(); }

  async loadMembers() {
    this.members = await this.household.getMembers(this.identity.householdId);
    this.cdr.detectChanges();
    if (!this.sub) {
      this.sub = this.household.subscribeToMembers(this.identity.householdId, async () => {
        this.members = await this.household.getMembers(this.identity.householdId);
        this.cdr.detectChanges();
      });
    }
  }

  openOrders() { this.view = 'orders'; }
  openMeals() { this.view = 'meals'; }
  goHome() { this.view = 'home'; }
  copied = false;
  copyCode() {
    navigator.clipboard.writeText(this.identity.joinCode);
    this.copied = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 1500);
  }
}