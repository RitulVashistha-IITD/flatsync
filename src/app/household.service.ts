import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

// What we remember about "you" on this device, so you don't re-enter it every time.
interface Identity {
    householdId: string;
    memberId: string;
    name: string;
    householdName: string;
    joinCode: string;
}

@Injectable({ providedIn: 'root' })
export class HouseholdService {
    constructor(private sb: SupabaseService) { }

    // A short, easy-to-share code like "K7QP2M".
    private generateCode(): string {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I/L
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    // Create a new household + add yourself as its first member.
    async createHousehold(householdName: string, myName: string): Promise<Identity> {
        const joinCode = this.generateCode();

        const { data: household, error: hErr } = await this.sb.client
            .from('households')
            .insert({ name: householdName, join_code: joinCode })
            .select()
            .single();
        if (hErr) throw hErr;

        const { data: member, error: mErr } = await this.sb.client
            .from('members')
            .insert({ household_id: household.id, name: myName })
            .select()
            .single();
        if (mErr) throw mErr;

        const identity: Identity = {
            householdId: household.id,
            memberId: member.id,
            name: myName,
            householdName: household.name,
            joinCode: household.join_code,
        };
        this.saveIdentity(identity);
        return identity;
    }

    // Join an existing household using its code.
    async joinHousehold(code: string, myName: string): Promise<Identity | null> {
        const { data: household } = await this.sb.client
            .from('households')
            .select()
            .eq('join_code', code.toUpperCase().trim())
            .maybeSingle();
        if (!household) return null; // bad code

        const { data: member, error: mErr } = await this.sb.client
            .from('members')
            .insert({ household_id: household.id, name: myName })
            .select()
            .single();
        if (mErr) throw mErr;

        const identity: Identity = {
            householdId: household.id,
            memberId: member.id,
            name: myName,
            householdName: household.name,
            joinCode: household.join_code,
        };
        this.saveIdentity(identity);
        return identity;
    }

    // --- remembering who you are, on this device ---
    saveIdentity(identity: Identity): void {
        localStorage.setItem('flatsync_identity', JSON.stringify(identity));
    }
    getIdentity(): Identity | null {
        const raw = localStorage.getItem('flatsync_identity');
        return raw ? JSON.parse(raw) : null;
    }
    isInHousehold(): boolean {
        return this.getIdentity() !== null;
    }
    // Load everyone currently in a household.
    async getMembers(householdId: string) {
        const { data } = await this.sb.client
            .from('members')
            .select('id, name')
            .eq('household_id', householdId)
            .order('created_at');
        return data ?? [];
    }

    // Listen for members joining (or leaving) in real time.
    // `onChange` runs every time the members list changes.
    subscribeToMembers(householdId: string, onChange: () => void) {
        return this.sb.client
            .channel('members-' + householdId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'members', filter: 'household_id=eq.' + householdId },
                () => onChange()
            )
            .subscribe();
    }

}