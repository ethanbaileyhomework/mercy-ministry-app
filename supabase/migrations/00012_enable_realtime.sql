-- Admin dashboard subscribes to these tables via Supabase Realtime
-- (useRealtimeTable in DashboardPage.tsx), but the publication had no
-- tables registered, so live updates were never actually firing.
ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteer_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_records;
