-- Enforce allowed range for thermal_sensitivity at the DB layer.
-- The TypeScript type already constrains this to -2|−1|0|1|2, but a direct
-- REST/RPC call could bypass the client. This CHECK prevents out-of-range writes
-- that would cause incorrect outfit threshold shifts.
ALTER TABLE public.user_calibration
  ADD CONSTRAINT thermal_sensitivity_range
  CHECK (thermal_sensitivity BETWEEN -2 AND 2);
