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

  private houseSub: any = null;
  deletedByName = '';   // set when the household was deleted by someone else

  constructor(private household: HouseholdService, private cdr: ChangeDetectorRef) {
    this.identity = this.household.getIdentity();
  }

  async ngOnInit() {
    if (!this.identity) return;

    // was the household deleted while we were away?
    const status = await this.household.checkHouseholdStatus();
    if (!status.alive) {
      this.deletedByName = status.deletedBy || 'someone';
      this.confirmMode = 'deleted-notice';
      this.cdr.detectChanges();
      return; // don't load anything else
    }

    this.loadMembers();

    // live: if someone deletes it now, look up who and show the notice
    this.houseSub = this.household.subscribeToHousehold(
      this.identity.householdId,
      async () => {
        const s = await this.household.checkHouseholdStatus();
        this.deletedByName = s.deletedBy || 'someone';
        this.confirmMode = 'deleted-notice';
        this.cdr.detectChanges();
      }
    );
  }
  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
    if (this.houseSub) this.houseSub.unsubscribe();
  }

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

  // settings + confirmations
  confirmMode: 'none' | 'leave' | 'delete' | 'deleted-notice' = 'none';

  askLeave() { this.confirmMode = 'leave'; }
  askDelete() { this.confirmMode = 'delete'; }
  cancelConfirm() { this.confirmMode = 'none'; }

  async doLeave() {
    await this.household.leaveHousehold();
    location.reload(); // bounce back to onboarding
  }

  async doDelete() {
    await this.household.deleteHousehold();
    location.reload();
  }
  copied = false;
  copyCode() {
    navigator.clipboard.writeText(this.identity.joinCode);
    this.copied = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 1500);
  }

  acknowledgeDeleted() {
    this.household.clearIdentity();
    location.reload(); // back to onboarding
  }
}