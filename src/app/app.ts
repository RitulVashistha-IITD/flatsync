import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HouseholdService } from './household.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  mode: 'choose' | 'create' | 'join' = 'choose';
  householdName = '';
  myName = '';
  joinCode = '';
  error = '';
  busy = false;

  identity: any = null;
  members: { id: string; name: string }[] = [];
  private memberSub: any = null;

  constructor(
    private household: HouseholdService,
    private cdr: ChangeDetectorRef
  ) {
    this.identity = this.household.getIdentity();
  }

  ngOnInit() {
    if (this.identity) this.loadMembers();
  }

  ngOnDestroy() {
    if (this.memberSub) this.memberSub.unsubscribe();
  }

  async loadMembers() {
    if (!this.identity) return;
    this.members = await this.household.getMembers(this.identity.householdId);
    this.cdr.detectChanges();

    // start listening for live changes (only once)
    if (!this.memberSub) {
      this.memberSub = this.household.subscribeToMembers(
        this.identity.householdId,
        async () => {
          this.members = await this.household.getMembers(this.identity.householdId);
          this.cdr.detectChanges();
        }
      );
    }
  }

  async doCreate() {
    if (!this.householdName.trim() || !this.myName.trim()) {
      this.error = 'Please fill in both fields.';
      return;
    }
    this.busy = true; this.error = '';
    try {
      this.identity = await this.household.createHousehold(this.householdName, this.myName);
      this.cdr.detectChanges();
      this.loadMembers();
    } catch (e: any) {
      this.error = 'Something went wrong. Try again.';
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  async doJoin() {
    if (!this.joinCode.trim() || !this.myName.trim()) {
      this.error = 'Please enter the code and your name.';
      return;
    }
    this.busy = true; this.error = '';
    try {
      const result = await this.household.joinHousehold(this.joinCode, this.myName);
      if (!result) {
        this.error = 'No household found with that code.';
      } else {
        this.identity = result;
        this.cdr.detectChanges();
        this.loadMembers();
      }
    } catch (e: any) {
      this.error = 'Something went wrong. Try again.';
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }
}