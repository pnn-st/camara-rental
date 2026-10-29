-- ============================================================
-- Camera & Equipment Rental — logic.sql
-- Run after: schema.sql → data.sql → logic.sql
-- ============================================================

-- ── 1. Stored Procedure: sp_create_equipment_rental ──────────

CREATE OR REPLACE PROCEDURE sp_create_equipment_rental(
    p_customer_id    INT,
    p_staff_id       INT,
    p_insurance_id   INT,
    p_start_date     DATE,
    p_end_date       DATE,
    p_equipment_ids  INT[],
    p_deposit_amount NUMERIC(10,2),
    p_payment_method VARCHAR,
    INOUT p_rental_id INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_eq_id      INT;
    v_status     VARCHAR;
    v_fee_rate   NUMERIC(5,2);
    v_days       INT;
    v_snap_rate  NUMERIC(10,2);
    v_sum_snap   NUMERIC(10,2) := 0;
    v_total_fee  NUMERIC(10,2);
    v_conflict   INT;
BEGIN
    -- 1. Validate date range
    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION 'end_date (%) must be >= start_date (%)',
            p_end_date, p_start_date;
    END IF;

    -- 2. Validate each equipment piece
    FOREACH v_eq_id IN ARRAY p_equipment_ids LOOP
        -- Must exist
        SELECT status INTO v_status
          FROM equipment
         WHERE equipment_id = v_eq_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Equipment ID % does not exist', v_eq_id;
        END IF;

        -- Must not be under Maintenance
        IF v_status = 'Maintenance' THEN
            RAISE EXCEPTION 'Equipment ID % is currently under Maintenance', v_eq_id;
        END IF;

        -- Must not overlap with an active, unreturned rental
        SELECT COUNT(*) INTO v_conflict
          FROM rental_items ri
          JOIN rentals r ON r.rental_id = ri.rental_id
         WHERE ri.equipment_id = v_eq_id
           AND r.rental_status = 'Active'
           AND ri.returned_at IS NULL
           AND r.start_date <= p_end_date
           AND r.end_date   >= p_start_date;

        IF v_conflict > 0 THEN
            RAISE EXCEPTION
                'Equipment ID % has an overlapping active rental in the requested period',
                v_eq_id;
        END IF;
    END LOOP;

    -- 3. Fetch insurance fee_rate
    SELECT fee_rate INTO v_fee_rate
      FROM insurance
     WHERE insurance_id = p_insurance_id;

    -- days = end_date − start_date + 1
    v_days := (p_end_date - p_start_date) + 1;

    -- 4. INSERT rental
    INSERT INTO rentals (customer_id, staff_id, insurance_id,
                         start_date, end_date, deposit_amount)
    VALUES (p_customer_id, p_staff_id, p_insurance_id,
            p_start_date, p_end_date, p_deposit_amount)
    RETURNING rental_id INTO p_rental_id;

    -- 5. INSERT rental_items (snapshot daily_rate from equipment)
    FOREACH v_eq_id IN ARRAY p_equipment_ids LOOP
        SELECT daily_rate INTO v_snap_rate
          FROM equipment
         WHERE equipment_id = v_eq_id;

        INSERT INTO rental_items (rental_id, equipment_id, snapshot_daily_rate)
        VALUES (p_rental_id, v_eq_id, v_snap_rate);

        v_sum_snap := v_sum_snap + v_snap_rate;
    END LOOP;

    -- 6. UPDATE total_rental_fee = Σ(snapshot × days) × (1 + fee_rate/100)
    v_total_fee := ROUND(v_sum_snap * v_days * (1 + v_fee_rate / 100), 2);
    UPDATE rentals
       SET total_rental_fee = v_total_fee
     WHERE rental_id = p_rental_id;

    -- 7. Mark equipment as 'Rented' only when start_date <= today
    IF p_start_date <= CURRENT_DATE THEN
        UPDATE equipment
           SET status = 'Rented'
         WHERE equipment_id = ANY(p_equipment_ids);
    END IF;

    -- 8. INSERT deposit payment
    INSERT INTO payments (rental_id, payment_type, amount, payment_method)
    VALUES (p_rental_id, 'Deposit', p_deposit_amount, p_payment_method);

    -- 9. Commit
    COMMIT;
END;
$$;


-- ── 2. Trigger: trg_calculate_damage_fee ─────────────────────
--    AFTER INSERT ON inspection_logs → accumulate damage into rental

CREATE OR REPLACE FUNCTION fn_calculate_damage_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rental_id INT;
BEGIN
    -- Find rental_id via rental_items
    SELECT ri.rental_id INTO v_rental_id
      FROM rental_items ri
     WHERE ri.rental_item_id = NEW.rental_item_id;

    -- Accumulate damage_fee + repair_cost
    UPDATE rentals
       SET total_damage_fee = total_damage_fee + NEW.damage_fee + NEW.repair_cost
     WHERE rental_id = v_rental_id;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_calculate_damage_fee
    AFTER INSERT ON inspection_logs
    FOR EACH ROW
    EXECUTE FUNCTION fn_calculate_damage_fee();


-- ── 3. View: vw_equipment_utilization_and_revenue_summary ────

CREATE OR REPLACE VIEW vw_equipment_utilization_and_revenue_summary AS
WITH date_range AS (
    SELECT
        MIN(r.start_date)                          AS min_date,
        MAX(r.end_date)                            AS max_date,
        MAX(r.end_date) - MIN(r.start_date) + 1    AS total_days
    FROM rentals r
),
category_equipment AS (
    SELECT c.category_id,
           c.category_name,
           COUNT(e.equipment_id) AS equipment_count
      FROM categories c
      LEFT JOIN equipment e ON e.category_id = c.category_id
     GROUP BY c.category_id, c.category_name
),
rental_stats AS (
    SELECT e.category_id,
           SUM(r.end_date - r.start_date + 1)                          AS rented_days,
           SUM(ri.snapshot_daily_rate * (r.end_date - r.start_date + 1)) AS total_revenue
      FROM rental_items ri
      JOIN rentals   r ON r.rental_id   = ri.rental_id
      JOIN equipment e ON e.equipment_id = ri.equipment_id
     GROUP BY e.category_id
),
repair_stats AS (
    SELECT e.category_id,
           SUM(il.repair_cost) AS total_repair_cost
      FROM inspection_logs il
      JOIN rental_items ri ON ri.rental_item_id = il.rental_item_id
      JOIN equipment    e  ON e.equipment_id    = ri.equipment_id
     GROUP BY e.category_id
)
SELECT ce.category_name,
       ce.equipment_count,
       COALESCE(rs.rented_days, 0)                              AS rented_days,
       ROUND(
           COALESCE(rs.rented_days, 0)::NUMERIC
           / NULLIF(ce.equipment_count * dr.total_days, 0) * 100,
           2
       )                                                         AS utilization_pct,
       COALESCE(rs.total_revenue, 0)                             AS total_revenue,
       COALESCE(rep.total_repair_cost, 0)                        AS total_repair_cost
  FROM category_equipment ce
 CROSS JOIN date_range dr
  LEFT JOIN rental_stats  rs  ON rs.category_id  = ce.category_id
  LEFT JOIN repair_stats  rep ON rep.category_id = ce.category_id
 ORDER BY ce.category_name;
