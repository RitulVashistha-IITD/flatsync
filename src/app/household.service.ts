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

    // Leave: remove ME from the household, forget my identity on this device.
    async leaveHousehold(): Promise<void> {
        const id = this.getIdentity();
        if (!id) return;
        await this.sb.client.from('members').delete().eq('id', id.memberId);
        localStorage.removeItem('flatsync_identity');
    }

    // Delete: write a tombstone (so others learn who did it), then destroy
    // the household. The cascade removes members, order_items, meal_marks.
    async deleteHousehold(): Promise<void> {
        const id = this.getIdentity();
        if (!id) return;

        await this.sb.client.from('deleted_households').insert({
            household_id: id.householdId,
            household_name: id.householdName,
            deleted_by_name: id.name,
        });

        await this.sb.client.from('households').delete().eq('id', id.householdId);
        localStorage.removeItem('flatsync_identity');
    }

    // On load: is my household still alive? If it was deleted, return who did it.
    async checkHouseholdStatus(): Promise<{ alive: boolean; deletedBy?: string }> {
        const id = this.getIdentity();
        if (!id) return { alive: false };

        const { data: house } = await this.sb.client
            .from('households').select('id').eq('id', id.householdId).maybeSingle();
        if (house) return { alive: true };

        // gone — look up the tombstone for who deleted it
        const { data: tomb } = await this.sb.client
            .from('deleted_households').select('deleted_by_name')
            .eq('household_id', id.householdId).maybeSingle();

        return { alive: false, deletedBy: tomb?.deleted_by_name ?? 'someone' };
    }

    // Live: listen for this household being deleted.
    subscribeToHousehold(householdId: string, onDeleted: () => void) {
        return this.sb.client
            .channel('household-' + householdId)
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'households', filter: 'id=eq.' + householdId },
                () => onDeleted())
            .subscribe();
    }

    clearIdentity(): void {
        localStorage.removeItem('flatsync_identity');
    }

}