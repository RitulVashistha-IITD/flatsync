import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HouseholdService } from './household.service';
import { Onboarding } from './onboarding/onboarding';
import { HomeDashboard } from './home-dashboard/home-dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Onboarding, HomeDashboard],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  inHousehold = false;

  constructor(private household: HouseholdService) {
    this.inHousehold = this.household.isInHousehold();
  }

  onJoined() {
    this.inHousehold = true;
  }
}