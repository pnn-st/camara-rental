-- ============================================================
-- Camera & Equipment Rental — queries.sql  (10 queries)
-- Run after: schema.sql → data.sql → logic.sql
-- ============================================================

-- ── Q1  JOIN ≥3 tables ──────────────────────────────────────
-- Booking page: แสดงรายละเอียดสัญญาเช่าที่ Active พร้อมชื่อลูกค้า พนักงาน แผนประกัน
SELECT r.rental_id,
       c.full_name   AS customer_name,
       s.full_name   AS staff_name,
       i.plan_name,
       r.start_date,
       r.end_date,
       r.total_rental_fee,
       r.deposit_amount,
       r.rental_status
  FROM rentals   r
  JOIN customers c ON c.customer_id  = r.customer_id
  JOIN staff     s ON s.staff_id     = r.staff_id
  JOIN insurance i ON i.insurance_id = r.insurance_id
 WHERE r.rental_status = 'Active'
 ORDER BY r.start_date DESC;


-- ── Q2  JOIN ≥3 tables ──────────────────────────────────────
-- Return & Inspection page: แสดงรายการอุปกรณ์ที่ยังไม่คืนพร้อมชื่อหมวดหมู่และวันที่เช่า
SELECT ri.rental_item_id,
       r.rental_id,
       e.equipment_name,
       cat.category_name,
       e.serial_number,
       ri.snapshot_daily_rate,
       r.start_date,
       r.end_date,
       ri.returned_at
  FROM rental_items ri
  JOIN rentals    r   ON r.rental_id   = ri.rental_id
  JOIN equipment  e   ON e.equipment_id = ri.equipment_id
  JOIN categories cat ON cat.category_id = e.category_id
 WHERE ri.returned_at IS NULL
   AND r.rental_status = 'Active'
 ORDER BY r.end_date;


-- ── Q3  GROUP BY + HAVING ───────────────────────────────────
-- Dashboard: หมวดหมู่ที่มียอดรายได้รวมมากกว่า 50,000 บาท
SELECT cat.category_name,
       COUNT(DISTINCT ri.rental_item_id) AS times_rented,
       SUM(ri.snapshot_daily_rate * (r.end_date - r.start_date + 1)) AS total_revenue
  FROM rental_items ri
  JOIN rentals    r   ON r.rental_id    = ri.rental_id
  JOIN equipment  e   ON e.equipment_id  = ri.equipment_id
  JOIN categories cat ON cat.category_id = e.category_id
 GROUP BY cat.category_name
HAVING SUM(ri.snapshot_daily_rate * (r.end_date - r.start_date + 1)) > 50000
 ORDER BY total_revenue DESC;


-- ── Q4  GROUP BY + HAVING ───────────────────────────────────
-- Customer page: ลูกค้าที่เช่ามากกว่า 5 ครั้ง (frequent customers)
SELECT c.customer_id,
       c.full_name,
       c.email,
       COUNT(r.rental_id) AS rental_count,
       SUM(r.total_rental_fee) AS total_spent
  FROM customers c
  JOIN rentals   r ON r.customer_id = c.customer_id
 GROUP BY c.customer_id, c.full_name, c.email
HAVING COUNT(r.rental_id) > 5
 ORDER BY rental_count DESC;


-- ── Q5  GROUP BY + HAVING ───────────────────────────────────
-- Dashboard: พนักงานที่ดูแลสัญญาเช่ารวมมูลค่ามากกว่า 100,000 บาท
SELECT s.staff_id,
       s.full_name,
       s.role,
       COUNT(r.rental_id)       AS rentals_handled,
       SUM(r.total_rental_fee)  AS total_fee_handled
  FROM staff   s
  JOIN rentals r ON r.staff_id = s.staff_id
 GROUP BY s.staff_id, s.full_name, s.role
HAVING SUM(r.total_rental_fee) > 100000
 ORDER BY total_fee_handled DESC;


-- ── Q6  Subquery ────────────────────────────────────────────
-- Equipment page: อุปกรณ์ที่ไม่เคยถูกเช่าเลย (underutilised inventory)
SELECT e.equipment_id,
       e.equipment_name,
       e.serial_number,
       e.daily_rate,
       e.status
  FROM equipment e
 WHERE NOT EXISTS (
       SELECT 1
         FROM rental_items ri
        WHERE ri.equipment_id = e.equipment_id
 )
 ORDER BY e.equipment_id;


-- ── Q7  Correlated Subquery ─────────────────────────────────
-- Dashboard: ลูกค้าที่ค่าเช่าเฉลี่ยต่อสัญญาสูงกว่าค่าเฉลี่ยรวมทั้งระบบ
SELECT c.customer_id,
       c.full_name,
       c.email,
       (SELECT ROUND(AVG(r.total_rental_fee), 2)
          FROM rentals r
         WHERE r.customer_id = c.customer_id) AS avg_fee
  FROM customers c
 WHERE (SELECT AVG(r.total_rental_fee)
          FROM rentals r
         WHERE r.customer_id = c.customer_id)
       > (SELECT AVG(total_rental_fee) FROM rentals)
 ORDER BY avg_fee DESC;


-- ── Q8  Subquery ────────────────────────────────────────────
-- Dashboard: สัญญาเช่าที่มีค่าเสียหายสูงกว่าค่าเฉลี่ยของสัญญาที่มีความเสียหาย
SELECT r.rental_id,
       c.full_name       AS customer_name,
       r.total_damage_fee,
       r.total_rental_fee,
       r.start_date,
       r.end_date
  FROM rentals   r
  JOIN customers c ON c.customer_id = r.customer_id
 WHERE r.total_damage_fee > (
       SELECT AVG(r2.total_damage_fee)
         FROM rentals r2
        WHERE r2.total_damage_fee > 0
 )
 ORDER BY r.total_damage_fee DESC;


-- ── Q9  Window — RANK ───────────────────────────────────────
-- Dashboard: จัดอันดับอุปกรณ์ตามรายได้ภายในแต่ละหมวดหมู่ (Top-N per category)
SELECT *
  FROM (
    SELECT cat.category_name,
           e.equipment_name,
           e.serial_number,
           SUM(ri.snapshot_daily_rate * (r.end_date - r.start_date + 1)) AS revenue,
           RANK() OVER (
               PARTITION BY cat.category_id
               ORDER BY SUM(ri.snapshot_daily_rate * (r.end_date - r.start_date + 1)) DESC
           ) AS rank_in_category
      FROM rental_items ri
      JOIN rentals    r   ON r.rental_id    = ri.rental_id
      JOIN equipment  e   ON e.equipment_id  = ri.equipment_id
      JOIN categories cat ON cat.category_id = e.category_id
     GROUP BY cat.category_id, cat.category_name,
              e.equipment_id, e.equipment_name, e.serial_number
  ) ranked
 WHERE rank_in_category <= 3
 ORDER BY category_name, rank_in_category;


-- ── Q10 Window — ROW_NUMBER ─────────────────────────────────
-- Return & Inspection page: แสดงผลตรวจสอบล่าสุดของแต่ละ rental_item
SELECT *
  FROM (
    SELECT il.inspection_log_id,
           ri.rental_item_id,
           e.equipment_name,
           il.inspection_date,
           il.condition_note,
           il.damage_fee,
           il.repair_cost,
           ROW_NUMBER() OVER (
               PARTITION BY il.rental_item_id
               ORDER BY il.inspection_date DESC, il.inspection_log_id DESC
           ) AS rn
      FROM inspection_logs il
      JOIN rental_items ri ON ri.rental_item_id = il.rental_item_id
      JOIN equipment    e  ON e.equipment_id    = ri.equipment_id
  ) latest
 WHERE rn = 1
 ORDER BY inspection_date DESC;
