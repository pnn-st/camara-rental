# Camera & Equipment Rental (หัวข้อ 30)

Stack: React+Tailwind (Vite) / Node+Express+`pg` (no ORM) / PostgreSQL. Naming: lowercase snake_case, plural tables (`equipment`, `insurance` ใช้รูปเดิม). DBMS ต้องตรงกับ Lab.

## Working rules (สำหรับ AI ช่วยโค้ด — ประหยัด token)

- เขียนทีละไฟล์ ตอบเฉพาะโค้ด/diff ไม่อธิบายยาว ไม่ทวนสเปคซ้ำ
- ห้ามเปลี่ยนชื่อตาราง/คอลัมน์/ฟังก์ชันในสเปคนี้ ถ้าจำเป็นให้ถามก่อน
- ไฟล์รันตามลำดับ: `db/schema.sql → data.sql → logic.sql → queries.sql`
- โครง repo: `/db` `/server` `/client`

## 1. Tables (9) — schema.sql

PK = `<singular>_id SERIAL`. FK ทุกตัวมี index. ไม่ระบุ = ON DELETE RESTRICT.

- **categories**: category_name VARCHAR UNIQUE NN; description TEXT
- **equipment**: category_id FK; equipment_name NN; serial_number UNIQUE NN; daily_rate NUMERIC(10,2) NN CHECK>=0; status CHECK IN('Available','Rented','Maintenance') DEFAULT 'Available'
- **customers**: full_name NN; email UNIQUE NN; phone NN; id_card_number UNIQUE NN
- **staff**: full_name NN; role NN; email UNIQUE NN
- **insurance**: plan_name UNIQUE NN; coverage_limit NUMERIC(10,2) CHECK>=0; fee_rate NUMERIC(5,2) CHECK 0..100 (= % ของค่าเช่ารวม). seed แผน 'No Insurance' (0, 0)
- **rentals**: customer_id, staff_id, insurance_id (FK, NN); start_date, end_date DATE NN CHECK(end_date>=start_date); deposit_amount, total_rental_fee, total_damage_fee NUMERIC(10,2) DEFAULT 0; rental_status CHECK IN('Active','Completed','Cancelled') DEFAULT 'Active'
- **rental_items**: rental_id FK **CASCADE**; equipment_id FK; snapshot_daily_rate NUMERIC(10,2) NN; returned_at DATE NULL; **UNIQUE(rental_id, equipment_id)**
- **inspection_logs**: rental_item_id FK **CASCADE**; staff_id FK; inspection_date DATE NN DEFAULT CURRENT_DATE; condition_note TEXT; damage_fee, repair_cost NUMERIC(10,2) DEFAULT 0 CHECK>=0
- **payments**: rental_id FK **CASCADE**; payment_type CHECK IN('Deposit','Settlement','Fine'); amount NUMERIC(10,2) CHECK>=0; payment_method NN; payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**Indexes:** idx_equipment_category(category_id), idx_rentals_dates(start_date,end_date), idx_rentals_customer(customer_id), idx_rental_items_equipment(equipment_id), idx_inspection_rental_item(rental_item_id), idx_payments_rental(rental_id)

**Formula:** days = end*date − start_date + 1; total_rental_fee = Σ(snapshot_daily_rate × days) × (1 + fee_rate/100). total*\* เป็นค่า derived ที่ SP/Trigger เป็นผู้ดูแล (denormalize เพื่อ performance — ระบุในรายงาน 3NF)

## 2. Logic — logic.sql

**sp_create_equipment_rental** (PROCEDURE, plpgsql)

- Params: p_customer_id, p_staff_id, p_insurance_id, p_start_date, p_end_date, p_equipment_ids INT[], p_deposit_amount, p_payment_method, INOUT p_rental_id INT
- Flow: ตรวจ end>=start → ตรวจทุกชิ้น status<>'Maintenance' และ **ไม่ overlap** (rental_items JOIN rentals, rental_status='Active', returned_at IS NULL, ช่วงวันที่ทับ) → INSERT rentals → INSERT rental_items (snapshot rate จาก equipment) → UPDATE rentals.total_rental_fee → UPDATE equipment.status='Rented' เฉพาะเมื่อ start_date<=CURRENT_DATE → INSERT payments('Deposit') → COMMIT
- ผิดเงื่อนไข: `ROLLBACK; RAISE EXCEPTION '<msg>';` (ห้ามใช้ COMMIT/ROLLBACK ในบล็อกที่มี EXCEPTION; Express ต้อง `CALL` นอก BEGIN)

**trg_calculate_damage_fee**: function `fn_calculate_damage_fee()` RETURNS trigger; `AFTER INSERT ON inspection_logs FOR EACH ROW` → `rentals.total_damage_fee += NEW.damage_fee + NEW.repair_cost` (หา rental_id ผ่าน rental_items). ขอบเขต INSERT เท่านั้น (ระบุในรายงาน)

**vw_equipment_utilization_and_revenue_summary**: ต่อ category: equipment_count, rented_days, utilization_pct (= rented_days / (equipment_count × วันในช่วงข้อมูล) ×100), total_revenue (Σ snapshot×days), total_repair_cost

## 3. Data — data.sql (ห้ามคัดลอกแถวซ้ำ, FK/วันที่ต้องสอดคล้อง)

categories 8, equipment 150, customers 100, staff 10, insurance 4 (รวม No Insurance), **rentals ≥600**, **rental_items ≥900**, inspection_logs ~400, **payments ≥600**. ช่วงเช่าของอุปกรณ์ชิ้นเดียวกันห้ามทับกัน. สร้างด้วย Python+Faker → `data.sql`

## 4. Queries — queries.sql (10 ข้อ + คอมเมนต์อธิบายการใช้ในระบบ)

JOIN ≥3 ตาราง ×2 · GROUP BY+HAVING ×3 · Subquery/Correlated ×3 · Window (RANK/ROW_NUMBER/OVER) ×2

## 5. API (Express) / Pages (React)

- `GET/POST/PUT/DELETE /api/equipment`, `/api/customers`; `GET /api/categories|staff|insurance` (dropdown)
- `POST /api/rentals` → `CALL sp_create_equipment_rental(...)`; ส่ง error message จาก RAISE กลับ 400
- `GET /api/rentals/active`; `POST /api/returns` → pg transaction: INSERT inspection_logs (ยิง trigger) + set returned_at + equipment.status='Available' + ถ้าคืนครบปิดสัญญา 'Completed' + INSERT payments('Settlement'/'Fine')
- `GET /api/dashboard` → `SELECT * FROM vw_...`
- Pages: (1) Equipment & Customer CRUD (2) Booking (เลือก staff/insurance, validation, แสดง error rollback) (3) Return & Inspection (4) Dashboard (ตารางก่อน กราฟ Recharts เป็นของเสริม). ไม่ต้องมี login

## 6. Done checklist

- [ ] 4 ไฟล์ SQL รันตามลำดับบนเครื่องสะอาดไม่ error
- [ ] ทดสอบ SP: สำเร็จ / overlap / Maintenance → ROLLBACK
- [ ] ทดสอบ trigger (total_damage_fee เพิ่ม)
- [ ] README (ติดตั้ง+รัน), เล่ม PDF ตรงกับ schema
