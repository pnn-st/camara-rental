#!/usr/bin/env python3
"""Generate db/data.sql for Camera & Equipment Rental system."""

import random
from datetime import date, timedelta, datetime
from pathlib import Path

from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

# ── Config ──────────────────────────────────────────────────────
NUM_CATEGORIES   = 8
NUM_EQUIPMENT    = 150
NUM_CUSTOMERS    = 100
NUM_STAFF        = 10
NUM_INSURANCE    = 4
MIN_RENTALS      = 600
MIN_RENTAL_ITEMS = 900
TARGET_INSPECTIONS = 400

DATA_START = date(2024, 1, 1)
DATA_END   = date(2025, 10, 31)
CURRENT    = date(2025, 10, 15)       # simulated "today"

OUT = Path(__file__).resolve().parent / "data.sql"

# ── Helpers ─────────────────────────────────────────────────────
def esc(s: str) -> str:
    return s.replace("'", "''")

def sql_val(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, datetime):
        return f"'{v.strftime('%Y-%m-%d %H:%M:%S')}'"
    if isinstance(v, date):
        return f"'{v.isoformat()}'"
    if isinstance(v, str):
        return f"'{esc(v)}'"
    return str(v)

def insert(table: str, cols: list[str], rows: list[tuple]) -> str:
    lines = [f"INSERT INTO {table} ({', '.join(cols)}) VALUES"]
    for i, row in enumerate(rows):
        vals = ", ".join(sql_val(v) for v in row)
        comma = "," if i < len(rows) - 1 else ";"
        lines.append(f"  ({vals}){comma}")
    return "\n".join(lines)

def insert_batched(table: str, cols: list[str], rows: list[tuple],
                   batch: int = 500) -> str:
    parts = []
    for i in range(0, len(rows), batch):
        parts.append(insert(table, cols, rows[i : i + batch]))
    return "\n\n".join(parts)

# ── 1. Categories (8) ──────────────────────────────────────────
categories = [
    (1, "DSLR Cameras",          "Professional digital single-lens reflex cameras"),
    (2, "Mirrorless Cameras",    "Compact interchangeable-lens mirrorless camera bodies"),
    (3, "Camera Lenses",         "Interchangeable lenses for various camera systems"),
    (4, "Tripods & Stabilizers", "Camera support and stabilization equipment"),
    (5, "Lighting Equipment",    "Studio and portable lighting gear"),
    (6, "Audio Equipment",       "Microphones, recorders, and audio accessories"),
    (7, "Drones",                "Aerial photography and videography drones"),
    (8, "Accessories",           "Memory cards, batteries, bags, and other add-ons"),
]

# ── 2. Equipment (150) ─────────────────────────────────────────
TEMPLATES = {
    1: [("Canon EOS 5D Mark IV",85),("Canon EOS R5",120),("Nikon D850",90),
        ("Canon EOS 6D Mark II",65),("Nikon D780",75)],
    2: [("Sony A7 III",80),("Sony A7R V",130),("Fujifilm X-T5",70),
        ("Canon EOS R6 II",95),("Sony A7C II",85)],
    3: [("Canon EF 24-70mm f/2.8L",40),("Sony FE 70-200mm f/2.8 GM",55),
        ("Sigma 35mm f/1.4 Art",25),("Canon RF 50mm f/1.2L",60),
        ("Nikon Z 14-24mm f/2.8 S",50)],
    4: [("Manfrotto MT055CXPRO4",20),("DJI RS 3 Pro",45),
        ("Zhiyun Crane 4",35),("Benro Mach3 TMA38CL",18),
        ("Manfrotto MVH608AH",25)],
    5: [("Godox AD600Pro",35),("Aputure 600d Pro",50),
        ("Profoto B10 Plus",55),("Godox SL200III",28),
        ("Nanlite Forza 720B",45)],
    6: [("Rode NTG5",20),("Sennheiser MKE 600",25),
        ("Zoom H6",15),("Tascam DR-40X",12),
        ("Rode Wireless GO II",18)],
    7: [("DJI Mavic 3 Pro",95),("DJI Air 3",55),
        ("DJI Mini 4 Pro",35),("DJI Inspire 3",180),
        ("Autel EVO II Pro",75)],
    8: [("SanDisk 128GB CFexpress",8),("Sony 256GB SD UHS-II",5),
        ("Peak Design Camera Bag",10),("SmallRig Cage Kit",12),
        ("Tilta Nucleus-M FIZ",30)],
}

equipment_rows: list[tuple] = []
eq_daily_rates: dict[int, float] = {}
per_cat = NUM_EQUIPMENT // NUM_CATEGORIES          # 18
remainder = NUM_EQUIPMENT % NUM_CATEGORIES          # 6
eid = 0
for cat_id in range(1, NUM_CATEGORIES + 1):
    n = per_cat + (1 if cat_id <= remainder else 0)
    tmpls = TEMPLATES[cat_id]
    for i in range(n):
        eid += 1
        name, base = tmpls[i % len(tmpls)]
        rate = round(base + random.uniform(-5, 10), 2)
        serial = f"SN-{cat_id:02d}-{eid:04d}"
        status = "Maintenance" if random.random() < 0.03 else "Available"
        equipment_rows.append((eid, cat_id, name, serial, rate, status))
        eq_daily_rates[eid] = rate

maintenance_ids = {r[0] for r in equipment_rows if r[5] == "Maintenance"}

# ── 3. Customers (100) ─────────────────────────────────────────
customers: list[tuple] = []
used_c_emails: set[str] = set()
used_cards: set[str] = set()
for cid in range(1, NUM_CUSTOMERS + 1):
    nm = fake.name()
    while True:
        em = fake.ascii_email()
        if em not in used_c_emails:
            used_c_emails.add(em); break
    ph = fake.numerify("0#########")
    while True:
        card = fake.numerify("#############")
        if card not in used_cards:
            used_cards.add(card); break
    customers.append((cid, nm, em, ph, card))

# ── 4. Staff (10) ──────────────────────────────────────────────
ROLES = ["Manager", "Technician", "Sales Representative", "Inspector", "Support"]
staff: list[tuple] = []
used_s_emails: set[str] = set()
for sid in range(1, NUM_STAFF + 1):
    nm = fake.name()
    while True:
        em = fake.ascii_email()
        if em not in used_s_emails:
            used_s_emails.add(em); break
    staff.append((sid, nm, ROLES[sid % len(ROLES)], em))

# ── 5. Insurance (4) ───────────────────────────────────────────
insurance = [
    (1, "No Insurance",      0.00,     0.00),
    (2, "Basic Protection",  5000.00,  5.00),
    (3, "Standard Coverage", 15000.00, 8.00),
    (4, "Premium All-Risk",  50000.00, 12.00),
]

# ── 6. Rentals + rental_items ──────────────────────────────────
eq_intervals: dict[int, list[tuple[date, date]]] = {
    e: [] for e in range(1, NUM_EQUIPMENT + 1)
}

def overlaps(s1: date, e1: date, s2: date, e2: date) -> bool:
    return s1 <= e2 and s2 <= e1

def available(eq: int, s: date, e: date) -> bool:
    if eq in maintenance_ids:
        return False
    return all(not overlaps(s, e, s2, e2) for s2, e2 in eq_intervals[eq])

rentals: list[tuple] = []
r_items: list[tuple] = []
ri_id = 0
span = (DATA_END - DATA_START).days

attempt = 0
while (len(rentals) < MIN_RENTALS or len(r_items) < MIN_RENTAL_ITEMS) and attempt < 80_000:
    attempt += 1

    s = DATA_START + timedelta(days=random.randint(0, span - 1))
    dur = random.randint(1, 14)
    e = min(s + timedelta(days=dur - 1), DATA_END)
    days = (e - s).days + 1

    need_more_items = len(r_items) < MIN_RENTAL_ITEMS
    wt = [30, 45, 25] if need_more_items else [50, 35, 15]
    want = random.choices([1, 2, 3], weights=wt)[0]

    pool = random.sample(range(1, NUM_EQUIPMENT + 1), min(want * 5, NUM_EQUIPMENT))
    picked = [eq for eq in pool if available(eq, s, e)][:want]
    if not picked:
        continue

    rid = len(rentals) + 1
    cust = random.randint(1, NUM_CUSTOMERS)
    stf  = random.randint(1, NUM_STAFF)
    ins  = random.choices([1, 2, 3, 4], weights=[30, 30, 25, 15])[0]
    fee_rate = insurance[ins - 1][3]

    sum_snap = 0.0
    local_items: list[tuple] = []
    for eq in picked:
        ri_id += 1
        snap = eq_daily_rates[eq]
        sum_snap += snap
        local_items.append((ri_id, rid, eq, snap, None))
        eq_intervals[eq].append((s, e))

    total_rental_fee = round(sum_snap * days * (1 + fee_rate / 100), 2)
    deposit = round(total_rental_fee * random.uniform(0.20, 0.50), 2)

    # ── returned_at / status ──
    if e < CURRENT - timedelta(days=7):
        completed = random.random() < 0.92
    elif e < CURRENT:
        completed = random.random() < 0.55
    else:
        completed = False

    if completed:
        local_items = [
            (*it[:4], e + timedelta(days=random.randint(0, 2)))
            for it in local_items
        ]
        status = "Completed"
    else:
        status = "Active"

    rentals.append((rid, cust, stf, ins, s, e,
                    deposit, total_rental_fee, 0.00, status))
    r_items.extend(local_items)

# ── 7. Inspection logs (~400) ──────────────────────────────────
ri_to_rid = {it[0]: it[1] for it in r_items}

returned = [it for it in r_items if it[4] is not None]
random.shuffle(returned)

CONDITIONS = [
    "No damage found, equipment in excellent condition",
    "Minor scratches on body, fully functional",
    "Slight wear on lens mount, no impact on performance",
    "Small dent on corner, cosmetic damage only",
    "Equipment returned in perfect working condition",
    "Battery cover slightly loose, otherwise fine",
    "Minor scuff marks on exterior surface",
    "LCD screen has minor surface scratch",
    "Lens cap missing, equipment itself undamaged",
    "Strap mount slightly worn from use",
]

inspections: list[tuple] = []
rental_damage: dict[int, float] = {}
insp_id = 0

for it in returned[:TARGET_INSPECTIONS]:
    insp_id += 1
    stf = random.randint(1, NUM_STAFF)
    insp_date = it[4] + timedelta(days=random.randint(0, 1))
    note = random.choice(CONDITIONS)

    if random.random() < 0.25:
        dmg = round(random.uniform(50, 500), 2)
        rep = round(random.uniform(100, 800), 2)
    else:
        dmg, rep = 0.00, 0.00

    inspections.append((insp_id, it[0], stf, insp_date, note, dmg, rep))

    if dmg + rep > 0:
        rid = ri_to_rid[it[0]]
        rental_damage[rid] = rental_damage.get(rid, 0) + dmg + rep

# patch total_damage_fee
rentals = [
    (*r[:8], round(rental_damage.get(r[0], 0), 2), r[9])
    for r in rentals
]

# ── patch equipment status (Rented if active + started) ────────
rented_eqs: set[int] = set()
for it in r_items:
    if it[4] is None:                           # not returned
        r = rentals[it[1] - 1]                  # rental row
        if r[9] == "Active" and r[4] <= CURRENT:
            rented_eqs.add(it[2])

equipment_rows = [
    (*row[:5], "Rented" if row[0] in rented_eqs else row[5])
    for row in equipment_rows
]

# ── 8. Payments (≥600) ─────────────────────────────────────────
METHODS = ["Cash", "Credit Card", "Debit Card", "Bank Transfer", "QR Payment"]
payments: list[tuple] = []
pay_id = 0

for r in rentals:
    rid, _, _, _, s, e, dep, fee, dmg, status = r

    # Deposit
    pay_id += 1
    ts = datetime(s.year, s.month, s.day,
                  random.randint(8, 18), random.randint(0, 59), random.randint(0, 59))
    payments.append((pay_id, rid, "Deposit", dep, random.choice(METHODS), ts))

    # Settlement
    if status == "Completed":
        pay_id += 1
        settle = max(round(fee - dep, 2), 0.00)
        sd = e + timedelta(days=random.randint(0, 3))
        ts2 = datetime(sd.year, sd.month, sd.day,
                       random.randint(8, 18), random.randint(0, 59), random.randint(0, 59))
        payments.append((pay_id, rid, "Settlement", settle, random.choice(METHODS), ts2))

    # Fine
    if dmg > 0:
        pay_id += 1
        fd = e + timedelta(days=random.randint(1, 5))
        ts3 = datetime(fd.year, fd.month, fd.day,
                       random.randint(8, 18), random.randint(0, 59), random.randint(0, 59))
        payments.append((pay_id, rid, "Fine", dmg, random.choice(METHODS), ts3))

# ════════════════════════════════════════════════════════════════
# Write data.sql
# ════════════════════════════════════════════════════════════════
with open(OUT, "w", encoding="utf-8") as f:
    f.write("-- =============================================================\n")
    f.write("-- Camera & Equipment Rental — data.sql  (auto-generated)\n")
    f.write(f"-- Rentals: {len(rentals)}, Items: {len(r_items)}, "
            f"Inspections: {len(inspections)}, Payments: {len(payments)}\n")
    f.write("-- =============================================================\n\n")

    f.write(insert("categories",
                   ["category_id","category_name","description"],
                   categories) + "\n\n")

    f.write(insert_batched("equipment",
                   ["equipment_id","category_id","equipment_name",
                    "serial_number","daily_rate","status"],
                   equipment_rows) + "\n\n")

    f.write(insert_batched("customers",
                   ["customer_id","full_name","email","phone","id_card_number"],
                   customers) + "\n\n")

    f.write(insert("staff",
                   ["staff_id","full_name","role","email"],
                   staff) + "\n\n")

    f.write(insert("insurance",
                   ["insurance_id","plan_name","coverage_limit","fee_rate"],
                   insurance) + "\n\n")

    f.write(insert_batched("rentals",
                   ["rental_id","customer_id","staff_id","insurance_id",
                    "start_date","end_date","deposit_amount",
                    "total_rental_fee","total_damage_fee","rental_status"],
                   rentals) + "\n\n")

    f.write(insert_batched("rental_items",
                   ["rental_item_id","rental_id","equipment_id",
                    "snapshot_daily_rate","returned_at"],
                   r_items) + "\n\n")

    f.write(insert_batched("inspection_logs",
                   ["inspection_log_id","rental_item_id","staff_id",
                    "inspection_date","condition_note","damage_fee","repair_cost"],
                   inspections) + "\n\n")

    f.write(insert_batched("payments",
                   ["payment_id","rental_id","payment_type","amount",
                    "payment_method","payment_date"],
                   payments) + "\n\n")

    # Reset sequences so future INSERTs get correct next IDs
    f.write("-- Reset sequences\n")
    for tbl, col in [
        ("categories","category_id"),("equipment","equipment_id"),
        ("customers","customer_id"),("staff","staff_id"),
        ("insurance","insurance_id"),("rentals","rental_id"),
        ("rental_items","rental_item_id"),("inspection_logs","inspection_log_id"),
        ("payments","payment_id"),
    ]:
        f.write(f"SELECT setval(pg_get_serial_sequence('{tbl}', '{col}'), "
                f"(SELECT COALESCE(MAX({col}), 0) FROM {tbl}));\n")

print(f"[OK] Generated {OUT}")
print(f"   categories      : {len(categories)}")
print(f"   equipment       : {len(equipment_rows)}")
print(f"   customers       : {len(customers)}")
print(f"   staff           : {len(staff)}")
print(f"   insurance       : {len(insurance)}")
print(f"   rentals         : {len(rentals)}")
print(f"   rental_items    : {len(r_items)}")
print(f"   inspection_logs : {len(inspections)}")
print(f"   payments        : {len(payments)}")
