import { describe, it, expect } from 'vitest';
import { volunteerSchema, sessionSchema } from './validation';

describe('validation schemas', () => {
  describe('volunteerSchema', () => {
    it('validates correct volunteer data', () => {
      const validData = {
        first_name: 'John',
        last_name: 'Doe',
        pin: '1234',
        area: 'kitchen' as const,
        is_leader: false,
      };
      expect(() => volunteerSchema.parse(validData)).not.toThrow();
    });

    it('rejects invalid PIN', () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        pin: '123',
        area: 'kitchen' as const,
        is_leader: false,
      };
      expect(() => volunteerSchema.parse(invalidData)).toThrow();
    });

    it('rejects missing required fields', () => {
      const invalidData = {
        pin: '1234',
        area: 'kitchen' as const,
        is_leader: false,
      };
      expect(() => volunteerSchema.parse(invalidData)).toThrow();
    });
  });

  describe('sessionSchema', () => {
    it('validates correct session data', () => {
      const validData = {
        session_date: '2023-10-01',
        status: 'active' as const,
        people_served: 50,
        meals_served: 45,
        grocery_packs_given: 10,
      };
      expect(() => sessionSchema.parse(validData)).not.toThrow();
    });

    it('rejects invalid date format', () => {
      const invalidData = {
        session_date: '10/01/2023',
        status: 'active' as const,
      };
      expect(() => sessionSchema.parse(invalidData)).toThrow();
    });
  });
});