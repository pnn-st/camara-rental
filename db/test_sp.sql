-- ============================================================
-- Test sp_create_equipment_rental — 3 cases
-- Run after: schema.sql → data.sql → logic.sql
-- Usage:  psql -d <dbname> -f db/test_sp.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TEST 1 · Success — rent equipment 1 & 2 in a future period
-- Expected: returns new p_rental_id, inserts rental + items + payment
-- ────────────────────────────────────────────────────────────

CALL sp_create_equipment_rental(
    1,                              -- p_customer_id
    1,                              -- p_staff_id
    2,                              -- p_insurance_id  (Basic Protection, 5%)
    '2026-01-10'::DATE,             -- p_start_date
    '2026-01-15'::DATE,             -- p_end_date      (6 days)
    ARRAY[1, 2],                    -- p_equipment_ids
    500.00,                         -- p_deposit_amount
    'Cash',                         -- p_payment_method
    NULL                            -- p_rental_id  (INOUT, returned)
);

-- Verify rental
SELECT rental_id, customer_id, staff_id, insurance_id,
       start_date, end_date, deposit_amount,
       total_rental_fee, rental_status
  FROM rentals
 ORDER BY rental_id DESC
 LIMIT 1;

-- Verify rental_items
SELECT ri.rental_item_id, ri.equipment_id, ri.snapshot_daily_rate, ri.returned_at
  FROM rental_items ri
 WHERE ri.rental_id = (SELECT MAX(rental_id) FROM rentals);

-- Verify deposit payment
SELECT payment_id, payment_type, amount, payment_method
  FROM payments
 WHERE rental_id = (SELECT MAX(rental_id) FROM rentals);

-- Equipment status should stay 'Available' (start_date is in the future)
SELECT equipment_id, status
  FROM equipment
 WHERE equipment_id IN (1, 2);


-- ────────────────────────────────────────────────────────────
-- TEST 2 · Overlap — equipment 1 already booked 2026-01-10…15
-- Expected: ERROR  "Equipment ID 1 has an overlapping active rental…"
-- ────────────────────────────────────────────────────────────

CALL sp_create_equipment_rental(
    2, 1, 1,
    '2026-01-12'::DATE,             -- overlaps with 01-10…01-15
    '2026-01-18'::DATE,
    ARRAY[1],                       -- same equipment
    200.00,
    'Credit Card',
    NULL
);


-- ────────────────────────────────────────────────────────────
-- TEST 3 · Maintenance — equipment 10 set to Maintenance
-- Expected: ERROR  "Equipment ID 10 is currently under Maintenance"
-- ────────────────────────────────────────────────────────────

-- Prepare: force Maintenance status
UPDATE equipment SET status = 'Maintenance' WHERE equipment_id = 10;

CALL sp_create_equipment_rental(
    3, 1, 1,
    '2026-02-01'::DATE,
    '2026-02-05'::DATE,
    ARRAY[10],
    100.00,
    'Cash',
    NULL
);

-- Cleanup
UPDATE equipment SET status = 'Available' WHERE equipment_id = 10;


-- ────────────────────────────────────────────────────────────
-- TEST 4 · Trigger — trg_calculate_damage_fee
-- Expected: total_damage_fee increases by damage_fee + repair_cost
-- ────────────────────────────────────────────────────────────

-- Pick the first completed rental that has rental_items
-- and record its current total_damage_fee
SELECT r.rental_id, r.total_damage_fee AS before_damage
  FROM rentals r
  JOIN rental_items ri ON ri.rental_id = r.rental_id
 WHERE r.rental_status = 'Completed'
   AND ri.returned_at IS NOT NULL
 LIMIT 1;

-- Insert an inspection log for that rental_item (damage_fee=150, repair_cost=250)
INSERT INTO inspection_logs (rental_item_id, staff_id, inspection_date,
                             condition_note, damage_fee, repair_cost)
SELECT ri.rental_item_id, 1, CURRENT_DATE,
       'Test: scratch on lens body', 150.00, 250.00
  FROM rentals r
  JOIN rental_items ri ON ri.rental_id = r.rental_id
 WHERE r.rental_status = 'Completed'
   AND ri.returned_at IS NOT NULL
 LIMIT 1;

-- Verify: total_damage_fee should have increased by 400 (150 + 250)
SELECT r.rental_id, r.total_damage_fee AS after_damage
  FROM rentals r
  JOIN rental_items ri ON ri.rental_id = r.rental_id
 WHERE r.rental_status = 'Completed'
   AND ri.returned_at IS NOT NULL
 LIMIT 1;


-- ────────────────────────────────────────────────────────────
-- TEST 5 · View — vw_equipment_utilization_and_revenue_summary
-- Expected: one row per category with utilization stats
-- ────────────────────────────────────────────────────────────

SELECT category_name,
       equipment_count,
       rented_days,
       utilization_pct,
       total_revenue,
       total_repair_cost
  FROM vw_equipment_utilization_and_revenue_summary;
