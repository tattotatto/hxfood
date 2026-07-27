import { ForbiddenException } from '@nestjs/common';
import { canTransition, isTerminal } from './order.state-machine';

describe('OrderStateMachine', () => {
  describe('canTransition', () => {
    // ── All 15 uniquely defined valid transitions ──
    // (Rule 16 is the bulk "to cancelled" rule that overlaps with explicit rules)

    const validTransitions: Array<[string, string, string]> = [
      ['draft',              'pending_approval',    'store_admin'],
      ['pending_approval',   'approved',            'super_admin'],
      ['pending_approval',   'rejected',            'super_admin'],
      ['pending_approval',   'cancelled',           'store_admin'],
      ['pending_approval',   'cancelled',           'super_admin'],
      ['approved',           'cancelled',           'store_admin'],
      ['approved',           'cancelled',           'super_admin'],
      ['approved',           'pending_production',  'ck_admin'],
      ['approved',           'in_production',       'ck_admin'],
      ['pending_production', 'in_production',       'ck_admin'],
      ['in_production',      'produced',            'ck_admin'],
      ['partially_produced', 'produced',            'ck_admin'],
      ['in_production',      'partially_produced',  'ck_admin'],
      ['produced',           'partially_shipped',   'ck_admin'],
      ['produced',           'shipped',             'ck_admin'],
      ['partially_shipped',  'shipped',             'ck_admin'],
      ['shipped',            'received',            'store_admin'],
      // bulk cancel rule covers all non-terminal states
      ['draft',              'cancelled',           'store_admin'],
      ['draft',              'cancelled',           'super_admin'],
      ['pending_production', 'cancelled',           'store_admin'],
      ['pending_production', 'cancelled',           'super_admin'],
      ['in_production',      'cancelled',           'store_admin'],
      ['in_production',      'cancelled',           'super_admin'],
      ['partially_produced', 'cancelled',           'store_admin'],
      ['partially_produced', 'cancelled',           'super_admin'],
      ['produced',           'cancelled',           'store_admin'],
      ['produced',           'cancelled',           'super_admin'],
      ['partially_shipped',  'cancelled',           'store_admin'],
      ['partially_shipped',  'cancelled',           'super_admin'],
      ['shipped',            'cancelled',           'store_admin'],
      ['shipped',            'cancelled',           'super_admin'],
    ];

    it.each(validTransitions)(
      'allows %s → %s with role %s',
      (from: string, to: string, role: string) => {
        expect(canTransition(from, to, role)).toBe(true);
      },
    );

    // ── Invalid transitions ──

    it.each([
      ['draft',              'approved'],
      ['draft',              'shipped'],
      ['pending_approval',   'shipped'],
      ['approved',           'received'],
      ['produced',           'received'],
      ['shipped',            'approved'],
      ['pending_production', 'shipped'],
      ['in_production',      'pending_approval'],
      ['partially_produced', 'in_production'],
    ])(
      'throws ForbiddenException for invalid transition %s → %s (role=store_admin)',
      (from: string, to: string) => {
        expect(() => canTransition(from, to, 'store_admin')).toThrow(ForbiddenException);
      },
    );

    // ── Wrong role ──

    it.each([
      ['draft',              'pending_approval',    'super_admin'],
      ['pending_approval',   'approved',            'store_admin'],
      ['pending_approval',   'approved',            'ck_admin'],
      ['pending_approval',   'rejected',            'store_admin'],
      ['approved',           'pending_production',  'store_admin'],
      ['approved',           'pending_production',  'super_admin'],
      ['approved',           'in_production',       'store_admin'],
      ['pending_production', 'in_production',       'store_admin'],
      ['in_production',      'produced',            'store_admin'],
      ['in_production',      'partially_produced',  'store_admin'],
      ['produced',           'partially_shipped',   'store_admin'],
      ['produced',           'shipped',             'store_admin'],
      ['partially_shipped',  'shipped',             'store_admin'],
      ['shipped',            'received',            'super_admin'],
      ['shipped',            'received',            'ck_admin'],
    ])(
      'throws ForbiddenException for %s → %s with wrong role %s',
      (from: string, to: string, role: string) => {
        expect(() => canTransition(from, to, role)).toThrow(ForbiddenException);
      },
    );

    it('throws with message containing "Role" when wrong role', () => {
      try {
        canTransition('pending_approval', 'approved', 'store_admin');
        fail('Expected ForbiddenException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ForbiddenException);
        expect(e.message).toContain('Role');
      }
    });

    it('throws with message containing "Invalid transition" for unknown transitions', () => {
      try {
        canTransition('draft', 'shipped', 'store_admin');
        fail('Expected ForbiddenException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ForbiddenException);
        expect(e.message).toContain('Invalid transition');
      }
    });
  });

  describe('isTerminal', () => {
    it('returns true for rejected', () => {
      expect(isTerminal('rejected')).toBe(true);
    });

    it('returns true for received', () => {
      expect(isTerminal('received')).toBe(true);
    });

    it('returns true for cancelled', () => {
      expect(isTerminal('cancelled')).toBe(true);
    });

    it.each(['draft', 'pending_approval', 'approved', 'pending_production',
      'in_production', 'partially_produced', 'produced', 'partially_shipped', 'shipped'])(
      'returns false for non-terminal status %s',
      (status: string) => {
        expect(isTerminal(status)).toBe(false);
      },
    );

    // ── Terminal states have no outgoing transitions ──

    it.each(['rejected', 'received', 'cancelled'])(
      'terminal state %s cannot transition to any non-terminal state',
      (terminal: string) => {
        const targets = ['draft', 'pending_approval', 'approved', 'shipped'];
        for (const target of targets) {
          expect(() => canTransition(terminal, target, 'super_admin')).toThrow(ForbiddenException);
        }
      },
    );
  });
});
