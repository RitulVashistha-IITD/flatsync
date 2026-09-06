import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MealService, MealMark } from '../meal';

type Meal = 'breakfast' | 'lunch' | 'dinner';

@Component({
  selector: 'app-meal-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './meal-calendar.html',
  styleUrl: './meal-calendar.css',
})
export class MealCalendar implements OnInit, OnDestroy {
  @Input() householdId!: string;
  @Input() memberId!: string;
  @Input() members: { id: string; name: string }[] = [];

  meals: Meal[] = ['breakfast', 'lunch', 'dinner'];
  emoji: Record<Meal, string> = { breakfast: '🍳', lunch: '🥗', dinner: '🍽️' };
  marks: MealMark[] = [];
  private sub: any = null;
  date = '';

  // for the preference popup
  showPref = false;
  prefMeal: Meal = 'dinner';
  prefText = '';

  constructor(private mealSvc: MealService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.date = this.mealSvc.today();
    this.load();
  }
  ngOnDestroy() { if (this.sub) this.sub.unsubscribe(); }

  async load() {
    this.marks = await this.mealSvc.getMarks(this.householdId, this.date);
    this.cdr.detectChanges();
    if (!this.sub) {
      this.sub = this.mealSvc.subscribeToMarks(this.householdId, async () => {
        this.marks = await this.mealSvc.getMarks(this.householdId, this.date);
        this.cdr.detectChanges();
      });
    }
  }

  // my mark for a meal, if any
  myMark(meal: Meal): MealMark | undefined {
    return this.marks.find(m => m.member_id === this.memberId && m.meal === meal);
  }

  // am I eating this meal? (no row = yes, by default)
  amEating(meal: Meal): boolean {
    const m = this.myMark(meal);
    return m ? m.eating : true;
  }

  // head-count: total members minus those marked out
  countIn(meal: Meal): number {
    const outIds = this.marks.filter(m => m.meal === meal && !m.eating).map(m => m.member_id);
    return this.members.filter(mem => !outIds.includes(mem.id)).length;
  }
  countOut(meal: Meal): number {
    return this.members.length - this.countIn(meal);
  }

  // people who are out, plus any preferences, for the summary line
  outNames(meal: Meal): string {
    const outIds = this.marks.filter(m => m.meal === meal && !m.eating).map(m => m.member_id);
    return this.members.filter(mem => outIds.includes(mem.id)).map(mem => mem.name).join(', ');
  }
  prefs(meal: Meal): { name: string; text: string }[] {
    return this.marks
      .filter(m => m.meal === meal && m.eating && m.preference)
      .map(m => ({ name: this.nameFor(m.member_id), text: m.preference as string }));
  }
  nameFor(id: string): string {
    const m = this.members.find(x => x.id === id);
    return m ? m.name : '';
  }

  async setEating(meal: Meal, eating: boolean) {
    if (this.amEating(meal) === eating) return; // already in that state, nothing to do
    const existing = this.myMark(meal);
    await this.mealSvc.setMark(
      this.householdId, this.memberId, this.date, meal,
      eating,
      existing ? existing.preference : null
    );
  }

  openPref(meal: Meal) {
    this.prefMeal = meal;
    this.prefText = this.myMark(meal)?.preference ?? '';
    this.showPref = true;
  }
  async savePref() {
    await this.mealSvc.setMark(
      this.householdId, this.memberId, this.date, this.prefMeal,
      this.amEating(this.prefMeal), this.prefText.trim() || null
    );
    this.showPref = false;
    this.cdr.detectChanges();
  }
  cancelPref() { this.showPref = false; }
}