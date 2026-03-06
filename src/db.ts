import Database from 'better-sqlite3';

const db = new Database('invoices.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    ruc TEXT UNIQUE,
    address TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    invoice_number TEXT,
    issuer_name TEXT,
    issuer_ruc TEXT,
    issuer_address TEXT,
    issuer_phone TEXT,
    taxpayer_type TEXT,
    date TEXT,
    environment TEXT,
    payment_method TEXT,
    authorization_code TEXT,
    cashier TEXT,
    recipient_name TEXT,
    recipient_ruc TEXT,
    recipient_address TEXT,
    route TEXT,
    recipient_phone TEXT,
    subtotal_0 REAL,
    subtotal_15 REAL,
    vat_15 REAL,
    total REAL,
    appraisal REAL,
    observations TEXT,
    payment_type TEXT,
    payment_method_description TEXT,
    items JSON,
    raw_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients (id),
    UNIQUE(invoice_number, issuer_ruc)
  );
`);

// Migration helper to add missing columns if table exists
const columnsToAdd = [
  'issuer_address TEXT', 'issuer_phone TEXT', 'taxpayer_type TEXT',
  'environment TEXT', 'payment_method TEXT', 'authorization_code TEXT', 'cashier TEXT',
  'recipient_name TEXT', 'recipient_ruc TEXT', 'recipient_address TEXT', 'route TEXT',
  'recipient_phone TEXT', 'payment_type TEXT', 'payment_method_description TEXT',
  'subtotal_0 REAL', 'subtotal_15 REAL', 'vat_15 REAL', 'appraisal REAL', 'observations TEXT',
  'recipient_lat REAL', 'recipient_lng REAL'
];

columnsToAdd.forEach(colDef => {
  try {
    const colName = colDef.split(' ')[0];
    db.prepare(`ALTER TABLE invoices ADD COLUMN ${colDef}`).run();
  } catch (err: any) {
    // Ignore error if column already exists
    if (!err.message.includes('duplicate column name')) {
      console.error(`Error adding column: ${err.message}`);
    }
  }
});

export default db;
