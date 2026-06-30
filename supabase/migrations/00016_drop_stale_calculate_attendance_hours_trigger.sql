-- volunteer_attendance had two BEFORE UPDATE triggers left over from a
-- column rename (hours_calculated -> hours_served). The stale one still
-- referenced the dropped hours_calculated column, so it threw a Postgres
-- error on every UPDATE that set sign_out_time -- i.e. every individual
-- sign-out and every "End Session" bulk sign-out. The correct trigger
-- (trigger_calc_hours / calculate_hours(), writing to hours_served) stays.
DROP TRIGGER IF EXISTS trigger_calculate_hours ON public.volunteer_attendance;
DROP FUNCTION IF EXISTS public.calculate_attendance_hours();
