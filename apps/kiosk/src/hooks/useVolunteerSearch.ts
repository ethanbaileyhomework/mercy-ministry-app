import { useState, useEffect, useMemo } from 'react';
import type { Volunteer } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

export function useVolunteerSearch() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Load all active volunteers on mount
  useEffect(() => {
    async function loadVolunteers() {
      try {
        const { data, error } = await supabase
          .from('volunteers')
          .select('*')
          .eq('is_active', true)
          .order('first_name');

        if (error) throw error;
        setVolunteers((data as Volunteer[]) || []);
      } catch (err) {
        console.error('Failed to load volunteers:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVolunteers();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return volunteers.filter(
      (v) =>
        v.first_name.toLowerCase().includes(q) ||
        v.last_name.toLowerCase().includes(q) ||
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(q)
    );
  }, [volunteers, searchQuery]);

  return { volunteers, filtered, searchQuery, setSearchQuery, loading };
}
