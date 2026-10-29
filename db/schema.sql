-- ============================================================
-- Camera & Equipment Rental — schema.sql
-- Run first: psql -f schema.sql
-- ============================================================

-- Drop tables in reverse-dependency order
DROP TABLE IF EXISTS payments          CASCADE;
DROP TABLE IF EXISTS inspection_logs   CASCADE;
DROP TABLE IF EXISTS rental_items      CASCADE;
DROP TABLE IF EXISTS rentals           CASCADE;
DROP TABLE IF EXISTS equipment         CASCADE;
DROP TABLE IF EXISTS insurance         CASCADE;
DROP TABLE IF EXISTS staff             CASCADE;
DROP TABLE IF EXISTS customers         CASCADE;
DROP TABLE IF EXISTS categories        CASCADE;

-- 1. categories
CREATE TABLE categories (
    category_id   SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT
);

-- 2. equipment
CREATE TABLE equipment (
    equipment_id   SERIAL PRIMARY KEY,
    category_id    INT NOT NULL REFERENCES categories(category_id),
    equipment_name VARCHAR(200) NOT NULL,
    serial_number  VARCHAR(100) NOT NULL UNIQUE,
    daily_rate     NUMERIC(10,2) NOT NULL CHECK (daily_rate >= 0),
    status         VARCHAR(20) NOT NULL DEFAULT 'Available'
                   CHECK (status IN ('Available','Rented','Maintenance'))
);

-- 3. customers
CREATE TABLE customers (
    customer_id    SERIAL PRIMARY KEY,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(200) NOT NULL UNIQUE,
    phone          VARCHAR(30)  NOT NULL,
    id_card_number VARCHAR(30)  NOT NULL UNIQUE
);

-- 4. staff
CREATE TABLE staff (
    staff_id  SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    role      VARCHAR(80)  NOT NULL,
    email     VARCHAR(200) NOT NULL UNIQUE
);

-- 5. insurance
CREATE TABLE insurance (
    insurance_id   SERIAL PRIMARY KEY,
    plan_name      VARCHAR(100) NOT NULL UNIQUE,
    coverage_limit NUMERIC(10,2) CHECK (coverage_limit >= 0),
    fee_rate       NUMERIC(5,2)  CHECK (fee_rate >= 0 AND fee_rate <= 100)
);

-- 6. rentals
CREATE TABLE rentals (
    rental_id        SERIAL PRIMARY KEY,
    customer_id      INT NOT NULL REFERENCES customers(customer_id),
    staff_id         INT NOT NULL REFERENCES staff(staff_id),
    insurance_id     INT NOT NULL REFERENCES insurance(insurance_id),
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    deposit_amount   NUMERIC(10,2) DEFAULT 0,
    total_rental_fee NUMERIC(10,2) DEFAULT 0,
    total_damage_fee NUMERIC(10,2) DEFAULT 0,
    rental_status    VARCHAR(20) NOT NULL DEFAULT 'Active'
                     CHECK (rental_status IN ('Active','Completed','Cancelled')),
    CHECK (end_date >= start_date)
);

-- 7. rental_items
CREATE TABLE rental_items (
    rental_item_id      SERIAL PRIMARY KEY,
    rental_id           INT NOT NULL REFERENCES rentals(rental_id) ON DELETE CASCADE,
    equipment_id        INT NOT NULL REFERENCES equipment(equipment_id),
    snapshot_daily_rate  NUMERIC(10,2) NOT NULL,
    returned_at         DATE,
    UNIQUE (rental_id, equipment_id)
);

-- 8. inspection_logs
CREATE TABLE inspection_logs (
    inspection_log_id SERIAL PRIMARY KEY,
    rental_item_id    INT NOT NULL REFERENCES rental_items(rental_item_id) ON DELETE CASCADE,
    staff_id          INT NOT NULL REFERENCES staff(staff_id),
    inspection_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    condition_note    TEXT,
    damage_fee        NUMERIC(10,2) DEFAULT 0 CHECK (damage_fee >= 0),
    repair_cost       NUMERIC(10,2) DEFAULT 0 CHECK (repair_cost >= 0)
);

-- 9. payments
CREATE TABLE payments (
    payment_id     SERIAL PRIMARY KEY,
    rental_id      INT NOT NULL REFERENCES rentals(rental_id) ON DELETE CASCADE,
    payment_type   VARCHAR(20) NOT NULL
                   CHECK (payment_type IN ('Deposit','Settlement','Fine')),
    amount         NUMERIC(10,2) CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes (FK columns + composite)
-- ============================================================
CREATE INDEX idx_equipment_category      ON equipment(category_id);
CREATE INDEX idx_rentals_dates           ON rentals(start_date, end_date);
CREATE INDEX idx_rentals_customer        ON rentals(customer_id);
CREATE INDEX idx_rental_items_equipment  ON rental_items(equipment_id);
CREATE INDEX idx_inspection_rental_item  ON inspection_logs(rental_item_id);
CREATE INDEX idx_payments_rental         ON payments(rental_id);
