/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum StockStatus {
  IN_STOCK = "IN_STOCK",
  LOW_STOCK = "LOW_STOCK",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  OVERSTOCKED = "OVERSTOCKED"
}

export enum TransactionType {
  RECEIVED = "RECEIVED",
  DISPATCHED = "DISPATCHED",
  ADJUSTED = "ADJUSTED",
  RELOCATED = "RELOCATED"
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  currentLevel: number;
  reorderPoint: number;
  maxStock: number;
  cost: number;
  sellPrice: number;
  warehouseId: string;
  supplierId: string;
  status: StockStatus;
  lastUpdated: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacitySku: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  leadTimeDays: number;
  rating: number; // 1 to 5 stars
  riskStatus: "LOW" | "MEDIUM" | "HIGH";
}

export interface Transaction {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  type: TransactionType;
  quantity: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  warehouseId: string;
  operator: string;
  notes: string;
}

export interface AuditTrailLog {
  id: string;
  timestamp: string;
  user: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: "PRODUCT" | "WAREHOUSE" | "SUPPLIER" | "OTHER";
  entityId: string;
  details: string;
}

export interface AuditRecommendation {
  id: string;
  sku: string;
  productName: string;
  currentLevel: number;
  recommendedOrder: number;
  estimatedCost: number;
  supplierName: string;
  urgency: "CRITICAL" | "RECOMMENDED" | "MONITOR";
  reason: string;
}

export interface AuditReport {
  timestamp: string;
  summary: string;
  score: number; // Health rate (0-100)
  recommendations: AuditRecommendation[];
  savingsInsight: string;
}

export interface InventoryStats {
  totalSkus: number;
  totalAssetsValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  warehouseUtilizations: { [warehouseId: string]: { used: number; total: number; percentage: number } };
  categoryDistribution: { [category: string]: number };
  turnoverRate?: number;
}

export interface LiveStreamPayload {
  products: Product[];
  transactions: Transaction[];
  stats: InventoryStats;
  auditLogs: AuditTrailLog[];
  message?: string;
}
