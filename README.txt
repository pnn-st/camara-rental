================================================================================
โครงงานวิชาระบบฐานข้อมูล (Database Systems) ภาคการศึกษา 2569
หัวข้อที่ 30: ระบบบริการให้เช่าอุปกรณ์ถ่ายภาพ (Camera & Equipment Rental)
ชื่อระบบ: Cam Rental
================================================================================

[ สมาชิกในกลุ่ม ]
1. 67363030 นายนพกร กันทากาศ
   - บทบาท: Data Architect & DBA
   - หน้าที่: ออกแบบ EER, Relational Schema, Normalization (3NF/BCNF), Data Dictionary, DDL, Constraints และ Indexes
2. 67363849 นายปุณณัตถ์ พรหมเลิศ
   - บทบาท: Backend & DB Logic Engineer
   - หน้าที่: เขียน Stored Procedure, Trigger, View, Complex Queries 10 ข้อ และเขียนสคริปต์ Mock Data
3. 67366536 นางสาวเหมหงษ์ จำปานวน
   - บทบาท: Full-stack & Frontend Developer
   - หน้าที่: พัฒนาเว็บแอปพลิเคชัน (React + Express), Form Validation, สไลด์ และตัดต่อคลิปวิดีโอนำเสนอ

--------------------------------------------------------------------------------
1. ข้อมูลระบบฐานข้อมูลที่พัฒนา
--------------------------------------------------------------------------------
ระบบใช้ PostgreSQL เป็น DBMS โดยออกแบบตามข้อกำหนดหัวข้อที่ 30 ครบถ้วน:

1.1 ตารางทั้งหมด 9 ตาราง (ระดับ 3NF/BCNF):
- categories: เก็บหมวดหมู่อุปกรณ์ เช่น DSLR, Mirrorless, Lenses
- equipment: ข้อมูลกล้อง/เลนส์, serial number, ค่าเช่าต่อวัน, สถานะ (Available, Rented, Maintenance)
- customers: ข้อมูลลูกค้า ชื่อ เบอร์โทร อีเมล เลขบัตรประชาชน
- staff: ข้อมูลพนักงานและตำแหน่ง
- insurance: แผนประกันอุปกรณ์ (วงเงินคุ้มครองและอัตราค่าธรรมเนียม)
- rentals: สัญญาเช่าหลัก เก็บวันเริ่ม-คืน เงินมัดจำ ยอดรวมค่าเช่าและค่าปรับ
- rental_items: รายการอุปกรณ์ในแต่ละสัญญาเช่า พร้อมเก็บ snapshot_daily_rate และวันที่คืนจริง
- inspection_logs: บันทึกผลการตรวจสภาพกล้องตอนส่งคืน บันทึกค่าเสียหายและค่าซ่อม
- payments: ประวัติการชำระเงิน (Deposit, Settlement, Fine)

1.2 Stored Procedure (Transaction ACID):
- ชื่อ: sp_create_equipment_rental (ในไฟล์ db/logic.sql)
- การทำงาน: ใช้เปิดสัญญาเช่า โดยมี Transaction ตรวจสอบช่วงวันเช่า, ตรวจสอบสถานะว่าอุปกรณ์ต้องไม่ติดซ่อม, และตรวจว่าอุปกรณ์ไม่ถูกจองซ้อนทับวันกับสัญญาอื่น (Overlapping Check) หากผิดเงื่อนไขจะสั่ง ROLLBACK ทันที ถ้าผ่านจะคำนวณราคา สแนปช็อตราคาเช่า อัปเดตสถานะเป็น Rented บันทึกเงินมัดจำ และ COMMIT

1.3 Trigger:
- ชื่อ: trg_calculate_damage_fee (ในไฟล์ db/logic.sql)
- การทำงาน: เป็น AFTER INSERT บนตาราง inspection_logs เมื่อพนักงานบันทึกผลตรวจรับและใส่ค่าซ่อม/ค่าเสียหาย Trigger จะคำนวณและนำยอดไปบวกเพิ่มใน total_damage_fee ของตาราง rentals ให้อัตโนมัติ

1.4 Reporting View:
- ชื่อ: vw_equipment_utilization_and_revenue_summary (ในไฟล์ db/logic.sql)
- การทำงาน: สรุปสถิติรายหมวดหมู่อุปกรณ์ คำนวณอัตราการถูกเช่าใช้งานจริง (Utilization Rate %), รายได้รวม และยอดค่าซ่อมแซม

1.5 Complex Queries (ในไฟล์ db/queries.sql):
มีครบ 10 ข้อตามเกณฑ์ พร้อมคอมเมนต์อธิบายการใช้งาน:
- Q1, Q2: Multi-table JOIN มากกว่าหรือเท่ากับ 3 ตาราง
- Q3, Q4, Q5: GROUP BY + HAVING
- Q6, Q7, Q8: Subquery และ Correlated Subquery (เช่น NOT EXISTS ตรวจสอบอุปกรณ์ที่ไม่เคยถูกเช่า)
- Q9, Q10: Window Function (RANK จัดอันดับอุปกรณ์ยอดนิยม, ROW_NUMBER ดึงผลตรวจล่าสุด)

1.6 ปริมาณข้อมูลจำลอง (Mock Data ใน db/data.sql):
สร้างด้วย Python + Faker สอดคล้องตามเงื่อนไขทางธุรกิจ:
- rentals: 600 แถว (มากกว่าเกณฑ์ขั้นต่ำ 500 แถว)
- rental_items: 1,131 แถว
- payments: 1,224 แถว
- inspection_logs: 400 แถว
- equipment: 150 แถว
- customers: 100 แถว

--------------------------------------------------------------------------------
2. โครงสร้างไฟล์ในโปรเจกต์
--------------------------------------------------------------------------------
├── db/
│   ├── schema.sql            -> ไฟล์ DDL สร้างตาราง Constraints และ Indexes
│   ├── data.sql              -> ข้อมูลทดสอบ Mock Data
│   ├── logic.sql             -> Stored Procedure, Trigger และ View
│   ├── queries.sql           -> Complex Queries ทั้ง 10 ข้อ
│   └── test_sp.sql           -> สคริปต์ทดสอบ Procedure และ Trigger 5 เคส
├── server/                   -> Backend API (Node.js, Express, pg)
│   ├── index.js
│   ├── db.js
│   ├── .env                  -> ไฟล์คอนฟิกต่อฐานข้อมูล
│   └── routes/
├── client/                   -> Frontend (React, Vite, Tailwind CSS)
│   ├── src/
│   │   ├── pages/            -> หน้าเว็บ 4 หน้า (Manage, Booking, Returns, Dashboard)
│   │   └── components/
└── README.txt

--------------------------------------------------------------------------------
3. ขั้นตอนการติดตั้งและรันระบบ
--------------------------------------------------------------------------------
สิ่งที่ต้องมีในเครื่อง:
- PostgreSQL 14 ขึ้นไป
- Node.js 18+ และ npm

ขั้นตอนที่ 1: สร้างฐานข้อมูล
เปิด pgAdmin หรือ psql แล้วสร้างฐานข้อมูลชื่อ camera_rental:
   CREATE DATABASE camera_rental;

ขั้นตอนที่ 2: นำเข้าไฟล์ SQL (รันตามลำดับ)
เข้าฐานข้อมูล camera_rental แล้วรันไฟล์เรียงตามลำดับดังนี้:
   1. db/schema.sql
   2. db/data.sql
   3. db/logic.sql
   4. db/queries.sql

ขั้นตอนที่ 3: ตั้งค่า Backend
เข้าไปที่โฟลเดอร์ server ตรวจสอบไฟล์ server/.env ปรับ username และ password ให้ตรงกับเครื่อง:
   PORT=5000
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=camera_rental
   PGUSER=postgres
   PGPASSWORD=postgres

ขั้นตอนที่ 4: รันระบบ Web Application
เปิด Terminal 2 หน้าต่าง:

หน้าต่างที่ 1 (Backend):
   cd server
   npm install
   npm run dev
   (ระบบจะรันที่พอร์ต 5000)

หน้าต่างที่ 2 (Frontend):
   cd client
   npm install
   npm run dev
   (ระบบจะเปิดที่ http://localhost:5173)

จากนั้นเปิดเบราว์เซอร์ไปที่ http://localhost:5173 เพื่อใช้งานระบบ

--------------------------------------------------------------------------------
4. การทดสอบการทำงาน
--------------------------------------------------------------------------------
4.1 ทดสอบ Database Logic ผ่าน SQL:
สามารถรันไฟล์ db/test_sp.sql เพื่อดูผลลัพธ์การทดสอบ 5 เคส:
- เคส 1: จองปกติสำเร็จ
- เคส 2: ทดสอบจองวันชนกัน -> ระบบเกิดข้อผิดพลาดและ Rollback
- เคส 3: ทดสอบจองอุปกรณ์ที่ขึ้น Maintenance -> ระบบปฏิเสธการจอง
- เคส 4: ทดสอบ Trigger เพิ่มค่าซ่อมแล้วยอด total_damage_fee เพิ่มอัตโนมัติ
- เคส 5: ดึงผลลัพธ์จาก View สรุปอัตราการใช้งาน

4.2 ทดสอบผ่านหน้าเว็บ (UI):
- หน้า Equipment & Customers: จัดการข้อมูลกล้อง เลนส์ ลูกค้า และมีระบบ validation ตรวจเลขบัตรประชาชน/เบอร์โทร
- หน้า Rentals & Booking: ทดสอบเปิดสัญญาเช่า (เรียก Stored Procedure) คำนวณราคาพร้อมมัดจำ และถ้าเลือกอุปกรณ์ซ้ำวันเดิมจะมีแจ้งเตือนสีแดงจาก Exception
- หน้า Returns & Inspection: บันทึกรับคืนอุปกรณ์ ใส่ค่าเสียหาย (Trigger จะทำงานทันที)
- หน้า Dashboard: สรุปภาพรวมและแสดงกราฟอัตราการใช้งานอุปกรณ์ดึงจาก View
