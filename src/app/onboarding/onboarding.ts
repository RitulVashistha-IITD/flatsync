import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HouseholdService } from '../household.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding {
  @Output() joined = new EventEmitter<void>();

  mode: 'choose' | 'create' | 'join' = 'choose';
  householdName = '';
  myName = '';
  joinCode = '';
  error = '';
  busy = false;

  constructor(private household: HouseholdService, private cdr: ChangeDetectorRef) {}

  async doCreate() {
    if (!this.householdName.trim() || !this.myName.trim()) {
      this.error = 'Please fill in both fields.'; return;
    }
    this.busy = true; this.error = '';
    try {
      await this.household.createHousehold(this.householdName, this.myName);
      this.joined.emit();
    } catch (e) {
      this.error = 'Something went wrong. Try again.';
    } finally { this.busy = false; this.cdr.detectChanges(); }
  }

  async doJoin() {
    if (!this.joinCode.trim() || !this.myName.trim()) {
      this.error = 'Please enter the code and your name.'; return;
    }
    this.busy = true; this.error = '';
    try {
      const result = await this.household.joinHousehold(this.joinCode, this.myName);
      if (!result) this.error = 'No household found with that code.';
      else this.joined.emit();
    } catch (e) {
      this.error = 'Something went wrong. Try again.';
    } finally { this.busy = false; this.cdr.detectChanges(); }
  }
}