import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface MealMark {
  id: string;
  member_id: string;
  meal: 'breakfast' | 'lunch' | 'dinner';
  eating: boolean;
  preference: string | null;
}

@Injectable({ providedIn: 'root' })
export class MealService {
  constructor(private sb: SupabaseService) {}

  // Today's date as 'YYYY-MM-DD' (what the DB expects).
  today(): string {
    return new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
  }

  // All marks for a household for a given day.
  async getMarks(householdId: string, date: string): Promise<MealMark[]> {
    const { data } = await this.sb.client
      .from('meal_marks')
      .select('id, member_id, meal, eating, preference')
      .eq('household_id', householdId)
      .eq('meal_date', date);
    return (data as MealMark[]) ?? [];
  }

  // Set (or update) my status for one meal. Because no row = "eating",
  // we only need a row when someone opts out or adds a preference.
  async setMark(
    householdId: string, memberId: string, date: string,
    meal: 'breakfast' | 'lunch' | 'dinner',
    eating: boolean, preference: string | null
  ) {
    const { error } = await this.sb.client
      .from('meal_marks')
      .upsert(
        { household_id: householdId, member_id: memberId, meal_date: date, meal, eating, preference },
        { onConflict: 'member_id,meal_date,meal' }
      );
    if (error) throw error;
  }

  subscribeToMarks(householdId: string, onChange: () => void) {
    return this.sb.client
      .channel('meals-' + householdId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_marks', filter: 'household_id=eq.' + householdId },
        () => onChange()
      )
      .subscribe();
  }
}