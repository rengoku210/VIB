const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'vib.db');
const db = new DatabaseSync(dbPath);

console.log('Running Master Overhaul database migrations...');

// 1. payment_settings
try {
  const payCols = db.prepare("PRAGMA table_info(payment_settings)").all().map(c => c.name);
  console.log('payment_settings columns:', payCols.join(', '));
  const newCols = [
    { name: 'account_name', type: 'TEXT' },
    { name: 'bank_name', type: 'TEXT' },
    { name: 'account_number', type: 'TEXT' },
    { name: 'ifsc_code', type: 'TEXT' },
    { name: 'status', type: "TEXT DEFAULT 'active'" },
    { name: 'payment_methods_json', type: 'TEXT' },
    { name: 'is_active', type: 'INTEGER DEFAULT 1' },
  ];
  for (const col of newCols) {
    if (!payCols.includes(col.name)) {
      db.exec(`ALTER TABLE payment_settings ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Added column ${col.name} to payment_settings`);
    }
  }
} catch (e) {
  console.error('Error on payment_settings:', e.message);
}

// 2. rental_listings & rental_bookings
try {
  const rentalCols = db.prepare("PRAGMA table_info(rental_listings)").all().map(c => c.name);
  if (!rentalCols.includes('seller_whatsapp')) {
    db.exec("ALTER TABLE rental_listings ADD COLUMN seller_whatsapp TEXT");
    console.log("Added seller_whatsapp to rental_listings");
  }
  if (!rentalCols.includes('handover_instructions')) {
    db.exec("ALTER TABLE rental_listings ADD COLUMN handover_instructions TEXT");
    console.log("Added handover_instructions to rental_listings");
  }
  if (!rentalCols.includes('whatsapp_handover_enabled')) {
    db.exec("ALTER TABLE rental_listings ADD COLUMN whatsapp_handover_enabled INTEGER DEFAULT 1");
    console.log("Added whatsapp_handover_enabled to rental_listings");
  }

  const bookingCols = db.prepare("PRAGMA table_info(rental_bookings)").all().map(c => c.name);
  if (!bookingCols.includes('handover_status')) {
    db.exec("ALTER TABLE rental_bookings ADD COLUMN handover_status TEXT DEFAULT 'pending'");
    console.log("Added handover_status to rental_bookings");
  }
  if (!bookingCols.includes('whatsapp_contacted_at')) {
    db.exec("ALTER TABLE rental_bookings ADD COLUMN whatsapp_contacted_at TEXT");
    console.log("Added whatsapp_contacted_at to rental_bookings");
  }
} catch (e) {
  console.error('Error on rental tables:', e.message);
}

// 3. staff_permissions
db.exec(`
  CREATE TABLE IF NOT EXISTS staff_permissions (
    user_id TEXT PRIMARY KEY,
    permissions_json TEXT NOT NULL,
    assigned_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);
console.log('Verified staff_permissions table.');

// 4. financial_reports
db.exec(`
  CREATE TABLE IF NOT EXISTS financial_reports (
    id TEXT PRIMARY KEY,
    report_number TEXT NOT NULL,
    period_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    categories_json TEXT,
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    gross_revenue REAL DEFAULT 0,
    acquisition_costs REAL DEFAULT 0,
    gateway_fees REAL DEFAULT 0,
    net_profit REAL DEFAULT 0,
    report_data_json TEXT,
    generated_by TEXT,
    created_at TEXT NOT NULL
  )
`);
console.log('Verified financial_reports table.');

// 5. profit_margins
db.exec(`
  CREATE TABLE IF NOT EXISTS profit_margins (
    id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    selling_price REAL NOT NULL,
    acquisition_cost REAL NOT NULL,
    gateway_fee_pct REAL DEFAULT 0,
    operational_cost REAL DEFAULT 0,
    effective_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);
console.log('Verified profit_margins table.');

// 6. automations
db.exec(`
  CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    target_audience TEXT DEFAULT 'all',
    is_active INTEGER DEFAULT 1,
    delay_minutes INTEGER DEFAULT 0,
    cooldown_hours INTEGER DEFAULT 24,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);
console.log('Verified automations table.');

console.log('Database migration complete!');
