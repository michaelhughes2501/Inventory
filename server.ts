/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { 
  StockStatus, 
  TransactionType, 
  Product, 
  Warehouse, 
  Supplier, 
  Transaction, 
  InventoryStats, 
  LiveStreamPayload,
  AuditReport
} from "./src/types";
import { requireAuth, AuthRequest, requireRole } from "./src/middleware/auth.js";
import { adminAuth, adminDb } from "./src/lib/firebase-admin.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// ==========================================
// 1. DATA LAYER (Authoritative In-Memory Store)
// ==========================================

let warehouses: Warehouse[] = [
  { id: "wh-1", name: "Austin Hub - South", location: "Austin, TX", capacitySku: 2000 },
  { id: "wh-2", name: "Boston Depot - East", location: "Boston, MA", capacitySku: 1200 },
  { id: "wh-3", name: "Chicago Giga - Midwest", location: "Chicago, IL", capacitySku: 10000 },
];

let suppliers: Supplier[] = [
  { id: "sup-1", name: "ElectroLink Microchip Corp", contact: "orders@electrolink.com", leadTimeDays: 4, rating: 4.8, riskStatus: "LOW" },
  { id: "sup-2", name: "Apex Sensors Lab", contact: "logistics@apexlabs.org", leadTimeDays: 7, rating: 4.6, riskStatus: "LOW" },
  { id: "sup-3", name: "Zenith Carton & Packaging", contact: "rfq@zenithbox.co", leadTimeDays: 14, rating: 3.1, riskStatus: "HIGH" },
  { id: "sup-4", name: "Pacific Copper & Raw Materials", contact: "metal-leads@paccopper.com", leadTimeDays: 9, rating: 4.1, riskStatus: "MEDIUM" },
];

let products: Product[] = [
  {
    id: "prod-1",
    sku: "SKU-QT-900",
    name: "Quantum Microchip Sensor XT-9",
    description: "Ultra-sensitive electromagnetic calibration micro-chip for medical sensor arrays.",
    category: "Sensors & ICs",
    currentLevel: 45,
    reorderPoint: 120,
    maxStock: 500,
    cost: 42.50,
    sellPrice: 135.00,
    warehouseId: "wh-1",
    supplierId: "sup-2",
    status: StockStatus.LOW_STOCK,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "prod-2",
    sku: "SKU-LB-320",
    name: "High-Capacity Lithium Ion Cell 3.7V",
    description: "Industrial-grade rechargeable power cells for heavy-duty electric tools.",
    category: "Power Sources",
    currentLevel: 800,
    reorderPoint: 250,
    maxStock: 1500,
    cost: 12.00,
    sellPrice: 32.50,
    warehouseId: "wh-3",
    supplierId: "sup-4",
    status: StockStatus.IN_STOCK,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "prod-3",
    sku: "SKU-AC-101",
    name: "ElectroLink Gold Coated Connector Pin",
    description: "Multichannel precision solder pins with pure gold plating for advanced telecommunication circuits.",
    category: "Connectors",
    currentLevel: 0,
    reorderPoint: 400,
    maxStock: 2500,
    cost: 0.35,
    sellPrice: 1.15,
    warehouseId: "wh-2",
    supplierId: "sup-1",
    status: StockStatus.OUT_OF_STOCK,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "prod-4",
    sku: "SKU-ZB-502",
    name: "Zenith Poly-Coated Folding Container Box",
    description: "Moisture-resistant flatpack shipping container boxes for delicate electronic devices.",
    category: "Packaging",
    currentLevel: 1350,
    reorderPoint: 200,
    maxStock: 1200,
    cost: 1.10,
    sellPrice: 3.80,
    warehouseId: "wh-3",
    supplierId: "sup-3",
    status: StockStatus.OVERSTOCKED,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "prod-5",
    sku: "SKU-CR-440",
    name: "Copper Rod Core Coil 10mm",
    description: "High conductivity continuous-cast wire rod coil, ready for magnetic winding.",
    category: "Raw Materials",
    currentLevel: 280,
    reorderPoint: 300,
    maxStock: 800,
    cost: 65.00,
    sellPrice: 145.00,
    warehouseId: "wh-3",
    supplierId: "sup-4",
    status: StockStatus.LOW_STOCK,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "prod-6",
    sku: "SKU-PC-777",
    name: "Apex Precision Laser Calibrator",
    description: "Nanosecond response spectral verification toolkit for laboratory calibration alignments.",
    category: "Sensors & ICs",
    currentLevel: 75,
    reorderPoint: 30,
    maxStock: 1500,
    cost: 195.00,
    sellPrice: 420.00,
    warehouseId: "wh-1",
    supplierId: "sup-2",
    status: StockStatus.IN_STOCK,
    lastUpdated: new Date().toISOString()
  }
];

let transactions: Transaction[] = [
  {
    id: "tx-initial-1",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    productId: "prod-1",
    productName: "Quantum Microchip Sensor XT-9",
    sku: "SKU-QT-900",
    type: TransactionType.RECEIVED,
    quantity: 100,
    warehouseId: "wh-1",
    operator: "A. Carter",
    notes: "Initial deployment inventory load."
  },
  {
    id: "tx-initial-2",
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    productId: "prod-1",
    productName: "Quantum Microchip Sensor XT-9",
    sku: "SKU-QT-900",
    type: TransactionType.DISPATCHED,
    quantity: 55,
    warehouseId: "wh-1",
    operator: "M. Hughes",
    notes: "Dispatched to aerospace development client."
  },
  {
    id: "tx-initial-3",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    productId: "prod-4",
    productName: "Zenith Poly-Coated Folding Container Box",
    sku: "SKU-ZB-502",
    type: TransactionType.RECEIVED,
    quantity: 1350,
    warehouseId: "wh-3",
    operator: "S. Jenkins",
    notes: "Bulk shipment from Zenith Carton."
  }
];

// Active SSE client connections
const sseClients = new Set<any>();

// State simulation flag
let simulationActive = true;

// ==========================================
// DATA ENGINE MUTATIONS & HELPERS
// ==========================================

function updateProductStatus(p: Product): StockStatus {
  if (p.currentLevel <= 0) {
    return StockStatus.OUT_OF_STOCK;
  } else if (p.currentLevel > p.maxStock) {
    return StockStatus.OVERSTOCKED;
  } else if (p.currentLevel <= p.reorderPoint) {
    return StockStatus.LOW_STOCK;
  } else {
    return StockStatus.IN_STOCK;
  }
}

function calculateStats(): InventoryStats {
  const lowStockCount = products.filter(p => p.status === StockStatus.LOW_STOCK).length;
  const outOfStockCount = products.filter(p => p.status === StockStatus.OUT_OF_STOCK).length;
  
  let totalAssetsValuation = 0;
  products.forEach(p => {
    totalAssetsValuation += p.currentLevel * p.cost;
  });

  const warehouseUtilizations: { [warehouseId: string]: { used: number; total: number; percentage: number } } = {};
  warehouses.forEach(w => {
    const qtyUsed = products
      .filter(p => p.warehouseId === w.id)
      .reduce((sum, p) => sum + p.currentLevel, 0);
    warehouseUtilizations[w.id] = {
      used: qtyUsed,
      total: w.capacitySku,
      percentage: Math.min(100, Math.round((qtyUsed / w.capacitySku) * 100))
    };
  });

  const categoryDistribution: { [category: string]: number } = {};
  products.forEach(p => {
    categoryDistribution[p.category] = (categoryDistribution[p.category] || 0) + p.currentLevel;
  });

  // Calculate simulated turnover rate for the last quarter
  // Approximation: (Total Dispatched Units Cost) / (Current Asset Valuation)
  let cogs = 0;
  transactions.filter(t => t.type === TransactionType.DISPATCHED).forEach(t => {
    const prod = products.find(p => p.id === t.productId);
    if (prod) {
      cogs += t.quantity * prod.cost;
    }
  });
  const turnoverRate = totalAssetsValuation > 0 ? (cogs / totalAssetsValuation).toFixed(2) : "0.00";

  return {
    totalSkus: products.length,
    totalAssetsValuation: Math.round(totalAssetsValuation * 100) / 100,
    lowStockCount,
    outOfStockCount,
    warehouseUtilizations,
    categoryDistribution,
    turnoverRate: parseFloat(turnoverRate)
  };
}

function pushTransaction(productId: string, type: TransactionType, quantity: number, notes: string, operator: string, extra?: { fromWH?: string; toWH?: string; warehouseId?: string }): Transaction {
  const prod = products.find(p => p.id === productId);
  if (!prod) throw new Error("Product not found");

  const tx: Transaction = {
    id: "tx-" + Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    productId,
    productName: prod.name,
    sku: prod.sku,
    type,
    quantity,
    operator,
    notes,
    warehouseId: extra?.warehouseId || prod.warehouseId,
    fromWarehouseId: extra?.fromWH,
    toWarehouseId: extra?.toWH
  };

  transactions.push(tx);
  // Keep transactions size capped
  if (transactions.length > 200) {
    transactions.shift();
  }

  // Write audit log to Firestore
  try {
    adminDb.collection('audit_logs').add({
      timestamp: new Date().toISOString(),
      action: type,
      operator: operator,
      details: notes,
      productId: productId,
      sku: prod.sku,
      quantity: quantity
    });
  } catch (err) {
    console.error("Failed to write audit log to Firestore:", err);
  }

  return tx;
}

function broadcastUpdate(message?: string) {
  const payload: LiveStreamPayload = {
    products,
    transactions: transactions.slice(-40).reverse(), // newest first
    stats: calculateStats(),
    message
  };

  const serialized = `data: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(serialized);
    } catch (e) {
      console.error("Error writing to SSE client", e);
    }
  });
}

// ==========================================
// 2. BACKEND LAYER - REST & SSE ENDPOINTS
// ==========================================

// real-time synchronization stream
app.get("/api/inventory/stream", async (req, res) => {
  const token = req.query.token as string;
  if (!token) return res.status(401).send("Unauthorized");
  try {
    await adminAuth.verifyIdToken(token);
  } catch (err) {
    return res.status(401).send("Unauthorized");
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Prime client with initial payload
  const payload: LiveStreamPayload = {
    products,
    transactions: transactions.slice(-40).reverse(),
    stats: calculateStats(),
    message: "Data stream connected to primary Server Storage Layer."
  };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// Full state retrieval
app.get("/api/inventory/data", requireAuth as express.RequestHandler, (req: any, res) => {
  res.json({
    warehouses,
    suppliers,
    products,
    transactions: transactions.slice(-40).reverse(),
    stats: calculateStats(),
    userRole: req.user?.role || 'Staff'
  });
});

// Bulk update products
app.post("/api/inventory/product/bulk-update", requireAuth as express.RequestHandler, requireRole(['Administrator', 'Manager']) as express.RequestHandler, (req, res) => {
  try {
    const { productIds, updates } = req.body;
    if (!productIds || !Array.isArray(productIds) || !updates) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    let updatedCount = 0;
    for (const id of productIds) {
      const prod = products.find(p => p.id === id);
      if (prod) {
        if (updates.category) prod.category = updates.category;
        prod.lastUpdated = new Date().toISOString();
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      broadcastUpdate(`Bulk updated ${updatedCount} products.`);
    }

    res.json({ message: `Updated ${updatedCount} products` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post("/api/inventory/product", requireAuth as express.RequestHandler, requireRole(['Administrator', 'Manager']) as express.RequestHandler, (req, res) => {
  try {
    const { sku, name, description, category, currentLevel, reorderPoint, maxStock, cost, sellPrice, warehouseId, supplierId, operator } = req.body;
    
    if (!sku || !name || !category || isNaN(currentLevel) || !warehouseId || !supplierId) {
       res.status(400).json({ error: "Missing required product descriptors or levels." });
       return;
    }

    if (products.some(p => p.sku === sku)) {
       res.status(400).json({ error: "SKU already registers in central database." });
       return;
    }

    const nLevel = Number(currentLevel);
    const nReorder = Number(reorderPoint);
    const nMax = Number(maxStock);
    const nCost = Number(cost);
    const nSell = Number(sellPrice);

    const newProd: Product = {
      id: "prod-" + Math.random().toString(36).substring(2, 9),
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || "",
      category,
      currentLevel: nLevel,
      reorderPoint: nReorder,
      maxStock: nMax,
      cost: nCost,
      sellPrice: nSell,
      warehouseId,
      supplierId,
      status: StockStatus.IN_STOCK, // Will calculate right after
      lastUpdated: new Date().toISOString()
    };

    newProd.status = updateProductStatus(newProd);
    products.push(newProd);

    pushTransaction(newProd.id, TransactionType.RECEIVED, nLevel, "Initial SKU entry catalog load.", operator || "System Administrator");
    broadcastUpdate(`SKU catalog updated: Created item ${newProd.sku} in ${warehouses.find(w => w.id === warehouseId)?.name}.`);

    res.status(201).json(newProd);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Execute transaction (Dispatch or Receive)
app.post("/api/inventory/transaction", requireAuth as express.RequestHandler, (req, res) => {
  try {
    const { productId, type, quantity, operator, notes } = req.body;
    
    if (!productId || !type || isNaN(quantity) || quantity <= 0) {
       res.status(400).json({ error: "Invalid transaction payload criteria." });
       return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) {
       res.status(404).json({ error: "Target product SKU registry not found." });
       return;
    }

    const qty = Number(quantity);

    if (type === TransactionType.DISPATCHED) {
      if (prod.currentLevel < qty) {
         res.status(400).json({ error: `Insufficient stock. Current: ${prod.currentLevel}, Dispatch requested: ${qty}.` });
         return;
      }
      prod.currentLevel -= qty;
    } else if (type === TransactionType.RECEIVED) {
      prod.currentLevel += qty;
    } else if (type === TransactionType.ADJUSTED) {
      // In a pure adjustment, we overwrite or add delta. We treat this as an additive delta
      prod.currentLevel = Math.max(0, qty); // set directly if adjusted
    }

    prod.status = updateProductStatus(prod);
    prod.lastUpdated = new Date().toISOString();

    pushTransaction(prod.id, type, qty, notes || `Manual stock ${type.toLowerCase()} audit.`, operator || "Supervisor Console");
    broadcastUpdate(`Stock transactional mutation: SKU ${prod.sku} level is now ${prod.currentLevel}.`);

    res.json(prod);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Transfer stock between warehouses
app.post("/api/inventory/transfer", requireAuth as express.RequestHandler, requireRole(['Administrator', 'Manager']) as express.RequestHandler, (req, res) => {
  try {
    const { productId, fromWarehouseId, toWarehouseId, quantity, operator, notes } = req.body;

    if (!productId || !fromWarehouseId || !toWarehouseId || isNaN(quantity) || quantity <= 0) {
       res.status(400).json({ error: "Invalid transfer inputs." });
       return;
    }

    if (fromWarehouseId === toWarehouseId) {
       res.status(400).json({ error: "Cannot relocate inventory into its original warehouse container." });
       return;
    }

    const prod = products.find(p => p.id === productId && p.warehouseId === fromWarehouseId);
    if (!prod) {
       res.status(404).json({ error: "SKU does not reside or exist at source warehouse location." });
       return;
    }

    const qty = Number(quantity);
    if (prod.currentLevel < qty) {
       res.status(400).json({ error: `Relocate allocation exceed levels. Holding: ${prod.currentLevel}, transfer: ${qty}.` });
       return;
    }

    // Step A: Deduct from source product node
    prod.currentLevel -= qty;
    prod.status = updateProductStatus(prod);
    prod.lastUpdated = new Date().toISOString();

    // Step B: Put/Add to destination product node
    let destProd = products.find(p => p.sku === prod.sku && p.warehouseId === toWarehouseId);
    if (!destProd) {
      // Duplicate SKU registry under new warehouse
      destProd = {
        ...prod,
        id: "prod-" + Math.random().toString(36).substring(2, 9),
        currentLevel: qty,
        warehouseId: toWarehouseId,
        lastUpdated: new Date().toISOString()
      };
      destProd.status = updateProductStatus(destProd);
      products.push(destProd);
    } else {
      destProd.currentLevel += qty;
      destProd.status = updateProductStatus(destProd);
      destProd.lastUpdated = new Date().toISOString();
    }

    // Capture logs under centralized repository
    const fromName = warehouses.find(w => w.id === fromWarehouseId)?.name || fromWarehouseId;
    const toName = warehouses.find(w => w.id === toWarehouseId)?.name || toWarehouseId;

    pushTransaction(prod.id, TransactionType.RELOCATED, qty, notes || `Relocating stock from ${fromName} to ${toName}.`, operator || "Transport Dock", {
      fromWH: fromWarehouseId,
      toWH: toWarehouseId,
      warehouseId: fromWarehouseId
    });

    broadcastUpdate(`Relocated ${qty} units of ${prod.sku} from ${fromName} to ${toName}.`);
    res.json({ source: prod, destination: destProd });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restock purchase order simulation
app.post("/api/inventory/restock-order", requireAuth as express.RequestHandler, requireRole(['Administrator', 'Manager']) as express.RequestHandler, (req, res) => {
  try {
    const { productId, quantity, operator } = req.body;
    const prod = products.find(p => p.id === productId);
    if (!prod) {
       res.status(404).json({ error: "Target product record missing." });
       return;
    }

    const supplier = suppliers.find(s => s.id === prod.supplierId);
    const orderQty = Number(quantity) || (prod.maxStock - prod.currentLevel);

    // Apply receiving update
    prod.currentLevel += orderQty;
    prod.status = updateProductStatus(prod);
    prod.lastUpdated = new Date().toISOString();

    pushTransaction(prod.id, TransactionType.RECEIVED, orderQty, `Supplier Purchase Order fulfilled via ${supplier?.name || "assigned supplier"}.`, operator || "AI Automatons Buffer");
    broadcastUpdate(`Supplier Purchase Order processed for SKU ${prod.sku}. Received ${orderQty} units.`);

    res.json(prod);
  } catch (err: any) {
     res.status(500).json({ error: err.message });
  }
});

// Toggle real-time simulation
app.post("/api/simulation/toggle", requireAuth as express.RequestHandler, requireRole(['Administrator']) as express.RequestHandler, (req, res) => {
  simulationActive = !simulationActive;
  broadcastUpdate(`Simulation environment toggled: ${simulationActive ? "ACTIVE" : "PAUSED"}`);
  res.json({ active: simulationActive });
});

// ==========================================
// 3. LAZY GEMINI API CLIENT & ROUTER
// ==========================================

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI Inventory Intelligence Audit Endpoint
app.post("/api/inventory/audit", requireAuth as express.RequestHandler, requireRole(['Administrator', 'Manager']) as express.RequestHandler, async (req, res) => {
  try {
    const systemPrompt = `You are an expert AI Supply Chain Auditor and Logistics Optimizer. 
You will examine the provided inventory raw data, warehouse utilization profiles, supplier catalogs, and recent stock transactions.
Your job is to generate a comprehensive, actionable restock audit.
You MUST respond with a JSON object exactly matching this schema:
{
  "summary": "High level expert executive summary evaluating current risk levels and bottlenecks (approx 3 sentences)",
  "score": 85, // Overall stock health rating between 0 and 100. Lower if out of stock etc.
  "recommendations": [
    {
      "id": "rec-1",
      "sku": "SKU-CODE",
      "productName": "Product Name",
      "currentLevel": 45,
      "recommendedOrder": 150,
      "estimatedCost": 6375,
      "supplierName": "Supplier Name",
      "urgency": "CRITICAL" | "RECOMMENDED" | "MONITOR",
      "reason": "Clear analytical reasoning (e.g. Lead time is 14 days, product will completely deplete in 3 days based on logs)"
    }
  ],
  "savingsInsight": "Specific procurement optimizations (e.g., combining items from Supplier Y to reduce freight, bulk pricing leverage point)"
}`;

    const inventoryRepresentation = {
      products: products.map(p => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        current: p.currentLevel,
        reorderPoint: p.reorderPoint,
        maxStock: p.maxStock,
        cost: p.cost,
        warehouse: warehouses.find(w => w.id === p.warehouseId)?.name,
        supplier: suppliers.find(s => s.id === p.supplierId)?.name,
        status: p.status
      })),
      suppliers: suppliers,
      warehouses: warehouses.map(w => ({
        name: w.name,
        utilization: calculateStats().warehouseUtilizations[w.id]
      })),
      recentTransactions: transactions.slice(-15)
    };

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      // Trigger user-friendly programmatic fallback if no API Key provided yet
      const fallbackReport = runProgrammaticFallbackAudit();
       res.json({
        ...fallbackReport,
        summary: "[Local Rule Engine] " + fallbackReport.summary + " Connect your Gemini developer key in settings to unlock real-time predictive auditing."
      });
      return;
    }

    const ai = getGenAI();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Please perform a comprehensive supply chain and logistics audit on this inventory system:\n\n${JSON.stringify(inventoryRepresentation)}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "score", "recommendations", "savingsInsight"],
          properties: {
            summary: { type: Type.STRING },
            score: { type: Type.INTEGER },
            savingsInsight: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "sku", "productName", "currentLevel", "recommendedOrder", "estimatedCost", "supplierName", "urgency", "reason"],
                properties: {
                  id: { type: Type.STRING },
                  sku: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  currentLevel: { type: Type.INTEGER },
                  recommendedOrder: { type: Type.INTEGER },
                  estimatedCost: { type: Type.NUMBER },
                  supplierName: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const parsedResponse = JSON.parse(result.text || "{}");
    res.json(parsedResponse);
  } catch (err: any) {
    console.error("Gemini API error inside backend server:", err);
    // Safe response fallback
    const fallbackReport = runProgrammaticFallbackAudit();
    res.json({
      ...fallbackReport,
      summary: `[Audit Engine Fallback] Evaluated fallback rule-set due to: ${err.message}. Please check API credentials.`
    });
  }
});

// Chatbot Endpoint
app.post("/api/chatbot", requireAuth as express.RequestHandler, async (req, res) => {
  try {
    const ai = getGenAI();
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided" });

    const inventoryRepresentation = {
      products: products.map(p => ({
        sku: p.sku,
        name: p.name,
        current: p.currentLevel,
        status: p.status
      }))
    };

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: `You are an expert AI inventory assistant. The current inventory status is: ${JSON.stringify(inventoryRepresentation)}. Keep your answers concise and helpful.`
      }
    });

    res.json({ reply: result.text || "I'm sorry, I don't know how to respond to that." });
  } catch (err: any) {
    console.error("Chatbot Error:", err);
    res.status(500).json({ reply: "I'm currently unable to connect to the knowledge base. Please try again later." });
  }
});

// Elegant Programmatic Rule-Based Fallback
function runProgrammaticFallbackAudit(): AuditReport {
  const recommendations: any[] = [];
  let score = 90;
  
  products.forEach(p => {
    const supplier = suppliers.find(s => s.id === p.supplierId);
    if (p.currentLevel <= p.reorderPoint) {
      const orderQty = p.maxStock - p.currentLevel;
      const urgency = p.currentLevel === 0 ? "CRITICAL" : "RECOMMENDED";
      score -= (p.currentLevel === 0 ? 15 : 7);
      
      recommendations.push({
        id: "rec-" + p.id,
        sku: p.sku,
        productName: p.name,
        currentLevel: p.currentLevel,
        recommendedOrder: orderQty,
        estimatedCost: orderQty * p.cost,
        supplierName: supplier?.name || "Default Supplier",
        urgency,
        reason: p.currentLevel === 0 
          ? `Product is fully depleted! Supplier Lead time is ${supplier?.leadTimeDays || 5} days. Restock immediately.`
          : `Current level of ${p.currentLevel} is below reorder point of ${p.reorderPoint}. Ordered quantity avoids freight bottlenecking.`
      });
    } else if (p.status === StockStatus.OVERSTOCKED) {
      score -= 4;
      recommendations.push({
        id: "rec-" + p.id,
        sku: p.sku,
        productName: p.name,
        currentLevel: p.currentLevel,
        recommendedOrder: 0,
        estimatedCost: 0,
        supplierName: supplier?.name || "Default Supplier",
        urgency: "MONITOR",
        reason: `Holding excess units. Austin capacity would benefit from high dispatch priorities or cross-hub transfer relocation.`
      });
    }
  });

  return {
    timestamp: new Date().toISOString(),
    summary: "Audit completed successfully. Operational and supply lines exhibit stable levels outside critical SKU depletion bottlenecks.",
    score: Math.max(10, score),
    recommendations,
    savingsInsight: "Procurement advises combining shipping weights for Raw Copper cores to Austin to secure bulk volume freight incentives."
  };
}

// ==========================================
// 4. REAL-TIME SIMULATED RE-STOCKS & ORDERS
// ==========================================

setInterval(() => {
  if (!simulationActive || sseClients.size === 0) return;

  try {
    // 60% chance to perform simulated activity (Receiving shipment vs Fulfilling incoming customer requests)
    if (Math.random() > 0.4) {
      const option = Math.random() > 0.5 ? "order" : "restock";
      if (option === "order") {
        // Find product that has level > 5 and simulate consumption
        const eligible = products.filter(p => p.currentLevel > 10 && p.status !== StockStatus.OUT_OF_STOCK);
        if (eligible.length > 0) {
          const prod = eligible[Math.floor(Math.random() * eligible.length)];
          const amount = Math.floor(Math.random() * 8) + 1; // 1 to 8 units
          
          prod.currentLevel -= amount;
          prod.status = updateProductStatus(prod);
          prod.lastUpdated = new Date().toISOString();
          
          pushTransaction(
            prod.id, 
            TransactionType.DISPATCHED, 
            amount, 
            `Automated warehouse fulfillment. Delivery dispatched to national client base.`,
            "Auto-Dispatcher Bot"
          );
          broadcastUpdate(`Real-time Sale: Fulfilled client invoice of ${amount} units for ${prod.sku}.`);
        }
      } else {
        // Find product that is low stock/out of stock and simulate a supplier shipping replenishment
        const eligibleList = products.filter(p => p.currentLevel <= p.reorderPoint);
        const itemToRestock = eligibleList.length > 0 
          ? eligibleList[Math.floor(Math.random() * eligibleList.length)]
          : products[Math.floor(Math.random() * products.length)];
          
        const supplier = suppliers.find(s => s.id === itemToRestock.supplierId);
        const amount = Math.floor((itemToRestock.maxStock - itemToRestock.currentLevel) * 0.5) || 50;

        itemToRestock.currentLevel += amount;
        itemToRestock.status = updateProductStatus(itemToRestock);
        itemToRestock.lastUpdated = new Date().toISOString();

        pushTransaction(
          itemToRestock.id, 
          TransactionType.RECEIVED, 
          amount, 
          `Supplier restock delivery arriving via freight logistics.`,
          "Receiving Dock Bot"
        );
        broadcastUpdate(`Simulated Logistics: Cargo shipment of ${amount} units received for SKU ${itemToRestock.sku} from ${supplier?.name}.`);
      }
    }
  } catch (err) {
    console.error("Simulation error in background thread:", err);
  }
}, 25000); // Trigger every 25 seconds for reliable real-time updates demo

// ==========================================
// 5. PRODUCTION BUILD STATIC ENGINE / DEV VITE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Three-Layer Server running on http://localhost:${PORT}`);
  });
}

startServer();
