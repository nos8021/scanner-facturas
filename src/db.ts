import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ override: true });

// Read from env vars, default to local file for dev
const url = process.env.TURSO_DATABASE_URL || 'file:invoices.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const db = createClient({
  url,
  authToken,
});

// Initialize database (Async wrapper since libsql is async)
export async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      ruc TEXT UNIQUE,
      address TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
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
      recipient_lat REAL,
      recipient_lng REAL,
      recipient_address_clean TEXT,
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
    'recipient_lat REAL', 'recipient_lng REAL', 'recipient_address_clean TEXT'
  ];

  for (const colDef of columnsToAdd) {
    try {
      await db.execute(`ALTER TABLE invoices ADD COLUMN ${colDef}`);
    } catch (err: any) {
      // Ignore error if column already exists
      if (!err.message.includes('duplicate column name')) {
        console.error(`Error adding column: ${err.message}`);
      }
    }
  }
}

export default db;
