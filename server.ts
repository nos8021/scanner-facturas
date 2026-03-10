import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import db, { initDB } from "./src/db.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file with override to ensure we get the local value
dotenv.config({ override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini
let apiKey = process.env.GEMINI_API_KEY;

// Fallback: Check other common environment variables
if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
  if (process.env.API_KEY && process.env.API_KEY !== "MY_GEMINI_API_KEY") {
    apiKey = process.env.API_KEY;
    console.log("Using API_KEY from environment.");
  } else if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== "MY_GEMINI_API_KEY") {
    apiKey = process.env.GOOGLE_API_KEY;
    console.log("Using GOOGLE_API_KEY from environment.");
  }
}

// Fallback: Manually read .env if apiKey is missing or placeholder
if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
  try {
    if (fs.existsSync('.env')) {
      const envConfig = dotenv.parse(fs.readFileSync('.env'));
      if (envConfig.GEMINI_API_KEY && envConfig.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
        console.log("Loaded GEMINI_API_KEY from .env file manually.");
        apiKey = envConfig.GEMINI_API_KEY;
      } else if (envConfig.API_KEY && envConfig.API_KEY !== "MY_GEMINI_API_KEY") {
        console.log("Loaded API_KEY from .env file manually.");
        apiKey = envConfig.API_KEY;
      }
    }
  } catch (e) {
    console.error("Could not read .env file:", e);
  }
}

console.log("--- DEBUG ENV ---");
console.log("Current working directory:", process.cwd());
console.log("GEMINI_API_KEY present:", !!apiKey);
if (apiKey) {
  console.log("GEMINI_API_KEY length:", apiKey.length);
  console.log("GEMINI_API_KEY starts with:", apiKey.substring(0, 5) + "...");
  console.log("GEMINI_API_KEY is placeholder:", apiKey === "MY_GEMINI_API_KEY");
}
console.log("-----------------");

if (!apiKey) {
  console.error("CRITICAL ERROR: API Key is missing. Checked GEMINI_API_KEY, API_KEY, and GOOGLE_API_KEY.");
} else if (apiKey === "MY_GEMINI_API_KEY") {
  console.error("CRITICAL ERROR: API Key is set to the placeholder value 'MY_GEMINI_API_KEY'. Please update your secrets to provide a valid key.");
} else {
  console.log(`API Key found (length: ${apiKey.length}). Initializing Gemini client...`);
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// API Routes

// 1. Analyze Image
app.post("/api/analyze", async (req, res) => {
  try {
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured",
        details: "Please set the GEMINI_API_KEY secret in the AI Studio environment."
      });
    }

    const { image } = req.body; // Expecting base64 string (without data:image/... prefix)

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      Extract fields from this invoice exactly as requested in the JSON schema. Use these hints for interpretation:
      - issuer_name: Emisor / Company name
      - issuer_ruc: RUC (e.g., 179...)
      - taxpayer_type: Special contributor text (e.g., "CONTRIBUYENTE ESPECIAL...")
      - invoice_number: Factura No. (00X-00X-...)
      - client_name: Cliente / Sender Name
      - recipient_name: Destinatario Name
      - route: Destino / Ruta
      - recipient_lat / recipient_lng: MUST calculate the exact latitude and longitude of the recipient's address in Ecuador (e.g. for "Bodega Enetsa Otavalo" or "Calle Principal"). This is critical for routing.
      - payment_type: F. Pago (e.g. CONTADO)
      - payment_method_description: Forma de Pago
      - items: List of products (Cant, Descripcion, V.Uni, Valor)
      - subtotal_0, subtotal_15, vat_15: Tarifa 0%, Tarifa 15%, IVA 15%
      - appraisal: Avalúo
      - cashier: Cajero
      Extract accurately without inventing data.
    `;

    const generateWithRetry = async () => {
      const config = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            // Section 1: Issuer
            issuer_name: { type: Type.STRING },
            issuer_ruc: { type: Type.STRING },
            issuer_address: { type: Type.STRING },
            issuer_phone: { type: Type.STRING },
            taxpayer_type: { type: Type.STRING },

            // Section 2: Client/Doc
            invoice_number: { type: Type.STRING },
            date: { type: Type.STRING },
            client_name: { type: Type.STRING },
            client_ruc: { type: Type.STRING },
            client_address: { type: Type.STRING },

            // Section 3: Recipient/Shipment
            recipient_name: { type: Type.STRING },
            recipient_ruc: { type: Type.STRING },
            recipient_address: { type: Type.STRING },
            route: { type: Type.STRING },
            recipient_lat: { type: Type.NUMBER, description: "Calculated latitude for the recipient address" },
            recipient_lng: { type: Type.NUMBER, description: "Calculated longitude for the recipient address" },
            recipient_phone: { type: Type.STRING },
            environment: { type: Type.STRING },
            payment_type: { type: Type.STRING }, // F. Pago
            authorization_code: { type: Type.STRING },

            // Financials
            subtotal_0: { type: Type.NUMBER },
            subtotal_15: { type: Type.NUMBER },
            vat_15: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
            appraisal: { type: Type.NUMBER },

            // Footer
            payment_method_description: { type: Type.STRING }, // Forma de Pago
            cashier: { type: Type.STRING },
            observations: { type: Type.STRING },

            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit_price: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      };

      const contents = {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Data } },
          { text: prompt }
        ]
      };

      try {
        console.log("Attempting analysis with gemini-2.5-flash...");
        return await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config
        });
      } catch (error: any) {
        if (error.status === 503 || error.message?.includes("503") || error.message?.includes("high demand")) {
          console.warn("gemini-2.5-flash overloaded (503). Retrying with gemini-2.0-flash...");
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
          return await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents,
            config
          });
        }
        throw error;
      }
    };

    const response = await generateWithRetry();

    if (!response.text) {
      throw new Error("No text response from Gemini");
    }

    const jsonResponse = JSON.parse(response.text);

    // Post-processing: Handle generic "Bodega" addresses
    // If address mentions "bodega" (word boundary) and is relatively short (likely a placeholder), infer specific warehouse location
    if (jsonResponse.recipient_address &&
      /\bbodega\b/i.test(jsonResponse.recipient_address) &&
      jsonResponse.recipient_address.length < 50) {

      if (jsonResponse.route) {
        // Split by common separators: "-", " a ", " to ", "/"
        // Example: "Guayaquil - Otavalo" -> "Otavalo"
        const parts = jsonResponse.route.split(/[-/]| a | to /i);
        const destination = parts[parts.length - 1].trim();

        if (destination) {
          // Update address to be specific (e.g., "Bodega Enetsa Otavalo")
          // This helps Google Maps find the correct warehouse
          jsonResponse.recipient_address = `Bodega Enetsa ${destination}`;
        }
      }
    }

    res.json(jsonResponse);

  } catch (error) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: "Failed to analyze image", details: error.message });
  }
});

// 2. Save Invoice
app.post("/api/save", async (req, res) => {
  try {
    const data = req.body;

    // LibSQL throws an error if any argument is strictly `undefined`. 
    // We defensively cast missing keys to `null`.
    const sanitize = (args: any[]) => args.map(arg => arg === undefined ? null : arg);

    // 1. Upsert Client
    let clientResult = await db.execute({
      sql: 'SELECT * FROM clients WHERE ruc = ?',
      args: sanitize([data.client_ruc])
    });

    let clientId;
    if (clientResult.rows.length === 0) {
      const info = await db.execute({
        sql: 'INSERT INTO clients (name, ruc, address) VALUES (?, ?, ?)',
        args: sanitize([data.client_name, data.client_ruc, data.client_address])
      });
      clientId = info.lastInsertRowid;
    } else {
      clientId = clientResult.rows[0].id;
    }

    // 2. Check for duplicate invoice
    const existingInvoice = await db.execute({
      sql: 'SELECT * FROM invoices WHERE invoice_number = ? AND issuer_ruc = ?',
      args: sanitize([data.invoice_number, data.issuer_ruc])
    });

    if (existingInvoice.rows.length > 0) {
      throw new Error("DUPLICATE_INVOICE");
    }

    // 3. Insert Invoice
    await db.execute({
      sql: `
        INSERT INTO invoices (
          client_id, invoice_number, issuer_name, issuer_ruc, issuer_address, issuer_phone, taxpayer_type,
          date, environment, payment_type, payment_method_description, authorization_code, cashier,
          recipient_name, recipient_ruc, recipient_address, route, recipient_phone,
        subtotal_0, subtotal_15, vat_15, total, appraisal, observations,
        items, raw_data, recipient_lat, recipient_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      args: sanitize([
        clientId,
        data.invoice_number,
        data.issuer_name,
        data.issuer_ruc,
        data.issuer_address,
        data.issuer_phone,
        data.taxpayer_type,
        data.date,
        data.environment,
        data.payment_type, // F. Pago
        data.payment_method_description, // Forma de Pago
        data.authorization_code,
        data.cashier,
        data.recipient_name,
        data.recipient_ruc,
        data.recipient_address,
        data.route,
        data.recipient_phone,
        data.subtotal_0,
        data.subtotal_15,
        data.vat_15,
        data.total,
        data.appraisal,
        data.observations,
        JSON.stringify(data.items || []),
        JSON.stringify(data),
        data.recipient_lat || null,
        data.recipient_lng || null
      ])
    });

    res.json({ success: true, clientId });

  } catch (error: any) {
    if (error.message === "DUPLICATE_INVOICE") {
      res.status(409).json({ error: "Esta factura ya ha sido registrada." });
    } else {
      console.error("Error saving invoice:", error);
      res.status(500).json({ error: "Failed to save invoice" });
    }
  }
});

// 3. Get Clients
app.get("/api/clients", async (req, res) => {
  const result = await db.execute('SELECT * FROM clients ORDER BY created_at DESC');
  res.json(result.rows);
});

// 4. Search
app.get("/api/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.length < 1) return res.json({ clients: [], invoices: [] });

  const pattern = `%${q}%`;

  // Search Clients (Name or RUC)
  const clientsResult = await db.execute({
    sql: `
      SELECT * FROM clients
      WHERE name LIKE ? OR ruc LIKE ?
      ORDER BY name ASC
      LIMIT 20
      `,
    args: [pattern, pattern]
  });

  // Search Invoices (Number)
  const invoicesResult = await db.execute({
    sql: `
      SELECT i.*, c.name as client_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.invoice_number LIKE ? OR c.name LIKE ? OR c.ruc LIKE ? OR i.recipient_name LIKE ?
      ORDER BY i.date DESC
      LIMIT 20
      `,
    args: [pattern, pattern, pattern, pattern]
  });

  res.json({ clients: clientsResult.rows, invoices: invoicesResult.rows });
});

// 5. Get Client Details & Invoices
app.get("/api/clients/:id", async (req, res) => {
  const clientResult = await db.execute({
    sql: 'SELECT * FROM clients WHERE id = ?',
    args: [req.params.id]
  });

  if (clientResult.rows.length === 0) return res.status(404).json({ error: "Client not found" });

  const invoicesResult = await db.execute({
    sql: 'SELECT * FROM invoices WHERE client_id = ? ORDER BY date DESC',
    args: [req.params.id]
  });

  // Parse items JSON
  const parsedInvoices = invoicesResult.rows.map((inv: any) => ({
    ...inv,
    items: JSON.parse(inv.items || '[]'),
    raw_data: JSON.parse(inv.raw_data || '{}')
  }));

  res.json({ client: clientResult.rows[0], invoices: parsedInvoices });
});

// 6. Get All Invoices (for Map)
app.get("/api/invoices", async (req, res) => {
  // Fetch invoices that have coordinates
  const result = await db.execute(`
    SELECT i.*, c.name as client_name 
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.recipient_lat IS NOT NULL AND i.recipient_lng IS NOT NULL
    ORDER BY i.date DESC
    LIMIT 500
      `);
  res.json(result.rows);
});

// 7. Delete Client
app.delete("/api/clients/:id", async (req, res) => {
  try {
    const clientId = req.params.id;
    // Delete all invoices associated with the client
    await db.execute({
      sql: 'DELETE FROM invoices WHERE client_id = ?',
      args: [clientId]
    });
    // Delete the client
    await db.execute({
      sql: 'DELETE FROM clients WHERE id = ?',
      args: [clientId]
    });
    res.json({ success: true, message: "Client and associated invoices deleted" });
  } catch (error: any) {
    console.error("Error deleting client:", error);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// 8. Delete Invoice
app.delete("/api/invoices/:id", async (req, res) => {
  try {
    const invoiceId = req.params.id;
    await db.execute({
      sql: 'DELETE FROM invoices WHERE id = ?',
      args: [invoiceId]
    });
    res.json({ success: true, message: "Invoice deleted" });
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// 9. Export Invoices to CSV for Google My Maps
app.get("/api/export/invoices", async (req, res) => {
  try {
    // Fetch all invoices
    const result = await db.execute(`
      SELECT i.*, c.name as client_name 
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY i.date DESC
    `);

    // Define CSV Headers required for My Maps
    const headers = [
      'Client Name',
      'Invoice Number',
      'Address',
      'Latitude',
      'Longitude',
      'Total',
      'Observations'
    ];

    // Map rows to CSV format
    const rows = result.rows.map((row: any) => {
      // Escape fields that might contain commas or quotes by wrapping in quotes
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        escapeCsv(row.recipient_name || row.client_name),
        escapeCsv(row.invoice_number),
        escapeCsv(row.recipient_address),
        escapeCsv(row.recipient_lat || ''),
        escapeCsv(row.recipient_lng || ''),
        escapeCsv(row.total),
        escapeCsv(row.observations)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=rutas_entrega.csv');
    res.send(csvContent);

  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).json({ error: "Failed to export CSV data" });
  }
});

// Vite middleware setup
async function startServer() {
  await initDB(); // Initialize sqlite/turso schema

  // Check if production build exists to serve it. This bypasses weird NODE_ENV issues on Render.
  const distPath = path.join(__dirname, "dist");
  const indexPath = path.join(distPath, "index.html");

  if (fs.existsSync(indexPath)) {
    console.log("Serving compiled production build from /dist");
    // Serve static files in production
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    console.log("Running in Development mode with Vite middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
