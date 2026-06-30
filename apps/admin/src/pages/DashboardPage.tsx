import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UtensilsCrossed, ShoppingBag, Clock, AlertTriangle, Plus, Thermometer, Power } from 'lucide-react';
import { useActiveSession, useRealtimeTable, formatTimeAEST, formatDateAEST, type VolunteerAttendance, type Session } from '@mercy/shared';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  volunteerCount: number;
  guestCount: number;
  mealsServed: number;
  groceryPacks: number;
  signedInVolunteers: (VolunteerAttendance & { volunteer_name: string; })[];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { session, setSession } = useActiveSession(supabase);
  const [stats, setStats] = useState<DashboardStats>({
    volunteerCount: 0, guestCount: 0, mealsServed: 0, groceryPacks: 0, signedInVolunteers: [],
  });
  const [alerts, setAlerts] = useState<string[]>([]);
  const [sessionElapsed, setSessionElapsed] = useState('');

  const loadStats = useCallback(async () => {
    if (!session) return;

    const [{ data: attendance }, { data: freshSession }] = await Promise.all([
      supabase
        .from('volunteer_attendance')
        .select('*, volunteers(first_name, last_name)')
        .eq('session_id', session.id)
        .is('sign_out_time', null),
      supabase.from('sessions').select('*').eq('id', session.id).single(),
    ]);

    const signedIn = (attendance || []).map((a: Record<string, unknown>) => {
      const vol = a.volunteers as Record<string, unknown>;
      return {
        ...a,
        volunteer_name: `${vol.first_name} ${vol.last_name}`,
      };
    });

    if (freshSession) {
      setSession(freshSession as Session);
    }

    const s = freshSession || session;
    setStats({
      volunteerCount: signedIn.length,
      guestCount: (s.people_served as number) || 0,
      mealsServed: (s.meals_served as number) || 0,
      groceryPacks: (s.grocery_packs_given as number) || 0,
      signedInVolunteers: signedIn as DashboardStats['signedInVolunteers'],
    });

    const newAlerts: string[] = [];

    const now = new Date();
    for (const vol of signedIn) {
      const signIn = new Date(vol.sign_in_time as string);
      const hours = (now.getTime() - signIn.getTime()) / (1000 * 60 * 60);
      if (hours > 5) {
        newAlerts.push(`${vol.volunteer_name} has been signed in for ${Math.floor(hours)} hours without signing out`);
      }
    }

    const [{ data: lastCheck }, { data: lowStock }] = await Promise.all([
      supabase
        .from('food_safety_logs')
        .select('logged_at')
        .eq('session_id', session.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('inventory_items')
        .select('item_name, current_quantity, minimum_threshold')
        .eq('is_active', true)
        .not('minimum_threshold', 'is', null),
    ]);

    if (lastCheck) {
      const lastCheckTime = new Date(lastCheck.logged_at as string);
      const hoursSinceCheck = (now.getTime() - lastCheckTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheck >= 2 && s.status === 'active') {
        newAlerts.push('Food temperature check overdue (last check > 2 hours ago)');
      }
    } else if (s.status === 'active') {
      newAlerts.push('No food temperature checks logged for this session');
    }

    for (const item of lowStock || []) {
      if ((item.current_quantity as number) <= (item.minimum_threshold as number)) {
        newAlerts.push(`Low stock: ${item.item_name} (${item.current_quantity} remaining)`);
      }
    }

    setAlerts(newAlerts);
  }, [session, setSession]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useRealtimeTable({
    supabase,
    table: 'volunteer_attendance',
    filter: session ? `session_id=eq.${session.id}` : undefined,
    onChange: loadStats,
    enabled: !!session,
  });

  useRealtimeTable({
    supabase,
    table: 'guest_records',
    filter: session ? `session_id=eq.${session.id}` : undefined,
    onChange: loadStats,
    enabled: !!session,
  });

  useEffect(() => {
    if (!session || session.status !== 'active' || !session.started_at) return;

    const updateElapsed = () => {
      const now = new Date();
      const start = new Date(session.started_at!);
      const diff = now.getTime() - start.getTime();
      if (diff < 0) { setSessionElapsed(''); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setSessionElapsed(`${h}h ${m}m`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  const handleOpenSession = async () => {
    if (!session) return;
    const now = new Date().toISOString();
    await supabase.from('sessions').update({ status: 'active', started_at: now }).eq('id', session.id);
    setSession({ ...session, status: 'active', started_at: now });
  };

  const handleCloseSession = async () => {
    if (!session || !confirm('Close this session? This will sign out all remaining volunteers and lock it for reporting.')) return;
    const now = new Date().toISOString();
    await supabase
      .from('volunteer_attendance')
      .update({ sign_out_time: now })
      .eq('session_id', session.id)
      .is('sign_out_time', null);
    await supabase.from('sessions').update({ status: 'completed', ended_at: now }).eq('id', session.id);
    setSession({ ...session, status: 'completed', ended_at: now });
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Clock size={48} className="text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Session Today</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Create a session to get started.</p>
        <button onClick={() => navigate('/sessions')} className="btn-primary">
          <Plus size={18} /> Create Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Session Control Centre</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {formatDateAEST(session.session_date + 'T00:00:00Z')}
            {sessionElapsed && <span className="ml-2 text-gold font-medium">({sessionElapsed} elapsed)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {session.status === 'draft' && (
            <button onClick={handleOpenSession} className="btn-gold"><Power size={18} /> Open Session</button>
          )}
          {session.status === 'active' && (
            <>
              <button onClick={() => navigate('/guests')} className="btn-primary"><Plus size={18} /> Add Guest</button>
              <button onClick={() => navigate('/food-safety')} className="btn-secondary"><Thermometer size={18} /> Log Temp</button>
              <button onClick={handleCloseSession} className="btn-danger"><Power size={18} /> Close Session</button>
            </>
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle size={18} className="shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Volunteers" value={stats.volunteerCount} color="text-navy dark:text-navy-300" />
        <StatCard icon={Users} label="Guests Served" value={stats.guestCount} color="text-green-600 dark:text-green-400" />
        <StatCard icon={UtensilsCrossed} label="Meals Served" value={stats.mealsServed} color="text-gold" />
        <StatCard icon={ShoppingBag} label="Grocery Packs" value={stats.groceryPacks} color="text-purple-600 dark:text-purple-400" />
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Currently Signed In</h2>
        {stats.signedInVolunteers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No volunteers currently signed in.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.signedInVolunteers.map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <div className="font-medium text-sm">{v.volunteer_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{v.area_on_day}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {formatTimeAEST(v.sign_in_time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size?: number }>; label: string; value: number; color: string; }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} className={color} />
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
