/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { initAuth, googleSignIn, logout, getAccessToken } from "./lib/firebase";
import { User } from "firebase/auth";
import { 
  Database, 
  Layers, 
  BrainCircuit, 
  Plus, 
  RefreshCw, 
  ArrowLeftRight, 
  Sparkles, 
  Coins, 
  Truck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Store,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  PlusCircle,
  HelpCircle,
  LogOut
} from "lucide-react";
import { 
  Product, 
  Warehouse, 
  Supplier, 
  Transaction, 
  InventoryStats, 
  AuditReport,
  StockStatus,
  TransactionType
} from "./types";
import DashboardStats from "./components/DashboardStats";
import WarehouseGraphs from "./components/WarehouseGraphs";
import ProductsTable from "./components/ProductsTable";
import TransactionsTrail from "./components/TransactionsTrail";
import WorkspacePanel from "./components/WorkspacePanel";
import Chatbot from "./components/Chatbot";

import { QRCodeSVG } from 'qrcode.react';

export default function App() {
  // --- AUTH STATE ---
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("Staff");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // --- CORE SYSTEM STATES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalSkus: 0,
    totalAssetsValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    warehouseUtilizations: {},
    categoryDistribution: {}
  });

  // --- UI STATE / INTERACTIVE VIEWS ---
  const [activeTab, setActiveTab] = useState<"catalog" | "audit" | "warehouses" | "workspace">("catalog");
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [systemMessage, setSystemMessage] = useState<string>("");
  const [messageTimer, setMessageTimer] = useState<number | null>(null);

  // --- DETAIL & TRANSACTION WORKSPACE ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [transferTargetProduct, setTransferTargetProduct] = useState<Product | null>(null);

  // --- NEW SKU FORM FIELDS ---
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLevel, setNewLevel] = useState<number>(100);
  const [newReorder, setNewReorder] = useState<number>(30);
  const [newMax, setNewMax] = useState<number>(500);
  const [newCost, setNewCost] = useState<number>(15.00);
  const [newSell, setNewSell] = useState<number>(39.99);
  const [newWarehouseId, setNewWarehouseId] = useState("");
  const [newSupplierId, setNewSupplierId] = useState("");
  const [operatorName, setOperatorName] = useState("Admin Controller");
  const [formError, setFormError] = useState("");

  // --- RELOCATE / TRANSFER FORM FIELDS ---
  const [transferSourceWH, setTransferSourceWH] = useState("");
  const [transferDestWH, setTransferDestWH] = useState("");
  const [transferQty, setTransferQty] = useState<number>(10);
  const [transferNotes, setTransferNotes] = useState("");
  const [transferError, setTransferError] = useState("");

  // --- AI RESTOCK INTELLIGENCE WORKSPACE ---
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string>("");
  const [auditProcessingIds, setAuditProcessingIds] = useState<string[]>([]);

  // Show a temporary system message bubble in the bottom right corner
  const triggerSysMessage = (msg: string) => {
    setSystemMessage(msg);
    if (messageTimer) clearTimeout(messageTimer);
    const timer = window.setTimeout(() => {
      setSystemMessage("");
    }, 4500);
    setMessageTimer(timer);
  };

  // --- LAYER 2 (APPLICATION): STATE SYNCHRONIZATION ---

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getAccessToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  const fetchCentralData = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch("/api/inventory/data");
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      const data = await res.json();
      setProducts(data.products);
      setWarehouses(data.warehouses);
      setSuppliers(data.suppliers);
      setTransactions(data.transactions);
      setStats(data.stats);
      if (data.userRole) setUserRole(data.userRole);

      // Pre-select first values for form convenience
      if (data.warehouses.length > 0) setNewWarehouseId(data.warehouses[0].id);
      if (data.suppliers.length > 0) setNewSupplierId(data.suppliers[0].id);
    } catch (err) {
      console.error("Central Data fetch failed:", err);
      triggerSysMessage("Failed to sync server storage buffers. Retrying...");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setNeedsAuth(false);
        fetchCentralData();
      },
      () => {
        setCurrentUser(null);
        setNeedsAuth(true);
      }
    );

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (needsAuth) return;
    
    let eventSource: EventSource | null = null;
    
    const connectSSE = async () => {
      const token = await getAccessToken();
      const url = token ? `/api/inventory/stream?token=${token}` : `/api/inventory/stream`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsLive(true);
        triggerSysMessage("Connected to Live Inventory Event Hub.");
      };

      eventSource.onerror = (e) => {
        setIsLive(false);
        console.error("SSE stream disconnected:", e);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.products) setProducts(payload.products);
          if (payload.transactions) setTransactions(payload.transactions);
          if (payload.stats) setStats(payload.stats);
          if (payload.message) {
            triggerSysMessage(payload.message);
          }
        } catch (err) {
          console.error("Error processing live frame update:", err);
        }
      };
    };
    
    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (messageTimer) clearTimeout(messageTimer);
    };
  }, [needsAuth]);

  // --- CONTROL ACTIONS (LAYER 1 OPERATIONAL INTERACTION WITH BACKEND) ---

  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newSku || !newName || !newCategory || !newWarehouseId || !newSupplierId) {
      setFormError("All required product fields (SKU, Name, Category, Warehouse, Supplier) must be resolved.");
      return;
    }

    if (newLevel < 0 || newReorder < 0 || newMax < newReorder || newCost <= 0 || newSell <= 0) {
      setFormError("Invalid numerical quantities or constraints. Verify limits.");
      return;
    }

    try {
      const res = await apiFetch("/api/inventory/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: newSku,
          name: newName,
          description: newDesc,
          category: newCategory,
          currentLevel: newLevel,
          reorderPoint: newReorder,
          maxStock: newMax,
          cost: newCost,
          sellPrice: newSell,
          warehouseId: newWarehouseId,
          supplierId: newSupplierId,
          operator: operatorName
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "SKU Collision inside central database registry.");
      }

      // Reset form variables
      setNewSku("");
      setNewName("");
      setNewDesc("");
      setNewCategory("");
      setIsAddModalOpen(false);
      triggerSysMessage(`SKU Registry Updated: Registered code ${newSku}.`);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleQuickAdjust = async (productId: string, type: TransactionType.RECEIVED | TransactionType.DISPATCHED, quantity: number, notes: string) => {
    try {
      const res = await apiFetch("/api/inventory/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          type,
          quantity,
          operator: operatorName,
          notes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error);
      }

      const updatedProd = await res.json();
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct(updatedProd);
      }
    } catch (err: any) {
      triggerSysMessage(`Operation Failed: ${err.message}`);
    }
  };

  const handleTransferRelocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError("");

    if (!transferTargetProduct || !transferSourceWH || !transferDestWH || transferQty <= 0) {
      setTransferError("Verify source, destination hubs, and quantity allocation specifications.");
      return;
    }

    if (transferSourceWH === transferDestWH) {
      setTransferError("Source physical node cannot match target physical node.");
      return;
    }

    if (transferTargetProduct.currentLevel < transferQty) {
      setTransferError(`Relocation quantites exceed storage levels (${transferTargetProduct.currentLevel} items available).`);
      return;
    }

    try {
      const res = await apiFetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: transferTargetProduct.id,
          fromWarehouseId: transferSourceWH,
          toWarehouseId: transferDestWH,
          quantity: transferQty,
          operator: operatorName,
          notes: transferNotes.trim() || `Inter-warehouse physical SKU shipment relocator.`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error);
      }

      setIsTransferModalOpen(false);
      setTransferTargetProduct(null);
      setTransferNotes("");
      triggerSysMessage("Relocate transshipment loaded successfully.");
    } catch (err: any) {
      setTransferError(err.message);
    }
  };

  const startAIAudit = async () => {
    setIsAuditing(true);
    setAuditError("");
    try {
      const res = await apiFetch("/api/inventory/audit", {
        method: "POST"
      });
      if (!res.ok) throw new Error("AIAudit call failed.");
      const report = await res.json();
      setAuditReport(report);
      triggerSysMessage("AI Auditor completed supply chain optimization analytics.");
    } catch (err: any) {
      setAuditError("Could not retrieve AI analysis data. Verify system configurations.");
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRestockOrder = async (recId: string, sku: string, recommendedOrder: number) => {
    if (recommendedOrder <= 0) return;
    
    // Find item with that SKU in the active product roster matching the recommendation criteria
    const item = products.find(p => p.sku === sku);
    if (!item) {
      triggerSysMessage(`SKU ${sku} not registered in current warehouse.`);
      return;
    }

    setAuditProcessingIds(prev => [...prev, recId]);

    try {
      const res = await apiFetch("/api/inventory/restock-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.id,
          quantity: recommendedOrder,
          operator: `AI Logistics Optimizer (${operatorName})`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error);
      }

      // Remove from audit list or mark resolved
      if (auditReport) {
        setAuditReport({
          ...auditReport,
          recommendations: auditReport.recommendations.filter(r => r.id !== recId)
        });
      }
      triggerSysMessage(`Purchase Order of ${recommendedOrder} units of ${sku} dispatch finalized.`);
    } catch (err: any) {
      triggerSysMessage(`Replenishment purchase order failed: ${err.message}`);
    } finally {
      setAuditProcessingIds(prev => prev.filter(id => id !== recId));
    }
  };

  const toggleSimulation = async () => {
    try {
      const res = await apiFetch("/api/simulation/toggle", { method: "POST" });
      const data = await res.json();
      setIsSimulationActive(data.active);
      triggerSysMessage(`Background event generator: ${data.active ? "LIVE" : "PAUSED"}`);
    } catch (err) {
      console.error("Error toggling background simulation thread:", err);
    }
  };

  const openTransferModal = (prod: Product) => {
    setTransferTargetProduct(prod);
    setTransferSourceWH(prod.warehouseId);
    // Find first distinct warehouse as destination
    const otherWH = warehouses.find(w => w.id !== prod.warehouseId);
    setTransferDestWH(otherWH ? otherWH.id : "");
    setTransferQty(Math.min(prod.currentLevel, 10) || 1);
    setTransferError("");
    setIsTransferModalOpen(true);
  };

  const handleSelectProductBySku = (sku: string) => {
    const matched = products.find(p => p.sku === sku);
    if (matched) {
      setSelectedProduct(matched);
      setActiveTab("catalog");
      // Smooth scroll if element exists or draw attention
      triggerSysMessage(`Located product audit context: ${matched.name}`);
    }
  };

  // Run initial AI report if user navigates to tab and none exists yet
  useEffect(() => {
    if (activeTab === "audit" && !auditReport && !isAuditing) {
      startAIAudit();
    }
  }, [activeTab]);

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-slate-100 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Nexus Inventory</h1>
          <p className="text-sm text-slate-500 mb-8 font-medium">Please sign in to access the central warehouse management system.</p>
          <button 
            onClick={async () => {
              setIsLoggingIn(true);
              try {
                const result = await googleSignIn();
                if (result) {
                  setCurrentUser(result.user);
                  setNeedsAuth(false);
                  fetchCentralData();
                }
              } catch (e) {
                console.error(e);
              } finally {
                setIsLoggingIn(false);
              }
            }}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {isLoggingIn ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
            {isLoggingIn ? "Signing In..." : "Sign in with Google"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* HEADER BAR (PRESENTATION LAYER) */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 id="app-main-title" className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Three-Layer Inventory Manager
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-medium">
                <span className="inline-block py-0.5 px-1.5 rounded-sm bg-slate-100 font-semibold border text-slate-700">PRESENTATION-APPLICATION-DATA</span>
                <span>•</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                  Central Host Synchronized
                </span>
              </div>
            </div>
          </div>

          {/* User Console Preferences */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Operator:</span>
              <span className="text-xs font-semibold text-slate-800 w-28 text-center truncate">
                {currentUser?.displayName || currentUser?.email || "Operator"}
              </span>
            </div>
            
            <button 
              onClick={async () => {
                await logout();
                setNeedsAuth(true);
              }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              id="refresh-sync-btn"
              onClick={fetchCentralData}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-white border border-slate-250 text-slate-605 hover:bg-slate-50 hover:text-indigo-600 transition cursor-pointer self-center"
              title="Recalculate Storage Valuation & Pull Data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* SYSTEM MAIN BODY CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* STATS TILES (DYNAMIC COGNIZANCE CONTROLLER) */}
        <DashboardStats 
          stats={stats} 
          isLive={isLive}
          onToggleSimulation={toggleSimulation}
          isSimulationActive={isSimulationActive}
          userRole={userRole}
        />

        {/* WORKSPACE SEPARATOR TABS */}
        <div className="flex items-center justify-between border-b border-slate-200 mb-8 pb-px">
          <div className="flex gap-1">
            <button
              id="tab-catalog-btn"
              onClick={() => setActiveTab("catalog")}
              className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${activeTab === "catalog" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Stock ledger SKUs
            </button>
            {userRole !== 'Staff' && (
              <button
                id="tab-audit-btn"
                onClick={() => setActiveTab("audit")}
                className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer flex items-center gap-1.5 ${activeTab === "audit" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                AI Procure Intelligence
              </button>
            )}
            <button
              id="tab-warehouses-btn"
              onClick={() => setActiveTab("warehouses")}
              className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${activeTab === "warehouses" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Hub Capacity Profiling
            </button>
            <button
              id="tab-workspace-btn"
              onClick={() => setActiveTab("workspace")}
              className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${activeTab === "workspace" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Workspace Integrations
            </button>
          </div>

          <div className="pb-4">
            {userRole !== 'Staff' && (
              <button
                id="open-register-modal-btn"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-xs hover:shadow-md transition cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Register New Product SKU</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW ROUTING (TAB SELECTIONS) */}
        
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            
            {/* LEFT 2 COLUMNS: Products Inventory ledger */}
            <div className="xl:col-span-2">
              <ProductsTable 
                products={products}
                warehouses={warehouses}
                suppliers={suppliers}
                userRole={userRole}
                onQuickAdjust={handleQuickAdjust}
                onSelectProduct={setSelectedProduct}
                onOpenRelocate={openTransferModal}
              />
            </div>

            {/* RIGHT SIDE: Real-Time Audit stream & Details inspector panel */}
            <div className="space-y-8">
              {/* Product detailed parameters inspector panel if one is selected */}
              {selectedProduct ? (
                <div id="product-inspector-panel" className="bg-white rounded-xl border border-indigo-200 p-6 shadow-xs relative overflow-hidden transition-all">
                  <div className="absolute top-0 right-0 py-1.5 px-3 bg-indigo-50 text-indigo-805 text-[9px] font-extrabold uppercase tracking-wider rounded-bl border-l border-b border-indigo-100">
                    ITEM PROFILE
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{selectedProduct.name}</h4>
                      <p className="text-xs font-mono font-bold text-indigo-600 mt-1 select-all">{selectedProduct.sku}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4 border-b pb-3 border-slate-100">{selectedProduct.description || "No item description furnished in catalog."}</p>

                  <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Inventory Status</span>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        selectedProduct.status === StockStatus.OUT_OF_STOCK ? "bg-rose-100 text-rose-700" :
                        selectedProduct.status === StockStatus.LOW_STOCK ? "bg-amber-100 text-amber-700 animate-pulse" :
                        selectedProduct.status === StockStatus.OVERSTOCKED ? "bg-indigo-100 text-indigo-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>{selectedProduct.status.replace("_", " ")}</span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Site Node</span>
                      <span className="font-semibold text-slate-800 line-clamp-1 mt-1">
                        {warehouses.find(w => w.id === selectedProduct.warehouseId)?.name || "Transit"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Core Cost Basis</span>
                      <span className="font-mono font-extrabold text-slate-900 mt-1 block">${selectedProduct.cost.toFixed(2)} USD</span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Selling Price</span>
                      <span className="font-mono font-extrabold text-indigo-700 mt-1 block">${selectedProduct.sellPrice.toFixed(2)} USD</span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Reorder Critical Level</span>
                      <span className="font-semibold text-slate-800 mt-1 block">{selectedProduct.reorderPoint} Units</span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Maximum Storage Cap</span>
                      <span className="font-semibold text-slate-800 mt-1 block">{selectedProduct.maxStock} Units</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 mb-5">
                    <span className="block text-[10px] uppercase font-bold tracking-wide text-slate-400 mb-1">Assigned Vendor Supply Line</span>
                    {(() => {
                      const sup = suppliers.find(s => s.id === selectedProduct.supplierId);
                      if (!sup) return <span className="text-xs text-slate-500">Unassigned Supplier</span>;
                      return (
                        <div className="text-[11px] text-slate-705">
                          <p className="font-bold text-slate-850">{sup.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Contact: {sup.contact}</p>
                          <div className="flex gap-2 items-center mt-1 text-[10px]">
                            <span className="bg-white border rounded px-1.5 font-bold">Lead: {sup.leadTimeDays} days</span>
                            <span className={`px-1 rounded font-bold uppercase text-[9px] ${
                              sup.riskStatus === "HIGH" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              sup.riskStatus === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>Risk: {sup.riskStatus}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowQRModal(true)}
                      className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-750 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      <span>Print QR Code</span>
                    </button>

                    <button
                      id="inspector-relocate-btn"
                      onClick={() => openTransferModal(selectedProduct)}
                      className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-750 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
                      <span>Transship Hub</span>
                    </button>

                    <button
                      id="inspector-restock-btn"
                      onClick={() => handleQuickAdjust(selectedProduct.id, TransactionType.RECEIVED, selectedProduct.maxStock - selectedProduct.currentLevel, `Supervisor forced replenishment request.`)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Truck className="h-3.5 w-3.5 text-indigo-200" />
                      <span>Replenish Max</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-205 border-dashed p-8 text-center text-slate-400 h-44 flex flex-col justify-center items-center">
                  <Database className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold leading-relaxed">No selected product catalog inspected.</p>
                  <p className="text-[10px] text-slate-405">Highlight any row on the stock list table to view metadata parameterizations.</p>
                </div>
              )}

              {/* Transactions stream auditing logs */}
              <TransactionsTrail 
                transactions={transactions} 
                onSelectProductBySku={handleSelectProductBySku}
              />
            </div>

          </div>
        )}

        {activeTab === "audit" && (
          <div className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-905 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600 fill-indigo-150 animate-bounce" />
                  AI Procurement Intelligence Hub
                </h3>
                <p className="text-xs text-slate-500">Real-time supply forecasting audit compiled by Gemini</p>
              </div>

              <button
                id="trigger-ai-audit-btn"
                onClick={startAIAudit}
                disabled={isAuditing}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold py-2 px-5 rounded-lg flex items-center gap-1.5 transition cursor-pointer self-start md:self-auto shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                {isAuditing ? "Analyzing Supply Lines..." : "Re-Initialize Supply Audit"}
              </button>
            </div>

            {auditError && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200/65 flex gap-2 items-center mb-6">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{auditError}</span>
              </div>
            )}

            {isAuditing ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full animate-pulse border border-indigo-200 mb-4">
                  <BrainCircuit className="h-10 w-10 animate-spin" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Synthesizing Logistics Analytics</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
                  Querying SKU capacities, risk assessments on suppliers, lead times, and dispatch rates to construct the optimal purchase plan...
                </p>
              </div>
            ) : auditReport ? (
              <div className="space-y-6">
                {/* Scoring & executive summary boxes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  <div className="p-5 bg-slate-950 text-white rounded-xl flex flex-col justify-between overflow-hidden relative">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Procurement Scorecard</span>
                    <div className="my-3">
                      <span className="text-6xl font-black text-cyan-400">{auditReport.score}</span>
                      <span className="text-slate-450 text-sm"> /100</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Weighted stocking thresholds evaluation acrossAustin, Boston, and Chicago depots.
                    </span>
                  </div>

                  <div className="md:col-span-2 p-5 bg-indigo-50/60 text-indigo-950 rounded-xl border border-indigo-200/40 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-900 block mb-2">Executive Strategy Briefing</span>
                      <p className="text-xs text-indigo-950 leading-relaxed font-semibold">
                        {auditReport.summary}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-indigo-200/40 flex gap-2 items-center text-[11px] text-indigo-900">
                      <Coins className="h-4 w-4 text-indigo-750 shrink-0" />
                      <span className="font-bold">Procurement Insight:</span>
                      <span className="font-semibold italic">{auditReport.savingsInsight}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendations Ledger list */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-550 mb-3.5">Actionable Purchase Guidelines</h4>
                  
                  {auditReport.recommendations && auditReport.recommendations.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed rounded-lg text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span>All product SKUs comply with physical safety targets. Logistics require no orders.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {auditReport.recommendations?.map(rec => {
                        const isProcessing = auditProcessingIds.includes(rec.id);
                        const costFormatted = new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(rec.estimatedCost);

                        return (
                          <div 
                            key={rec.id} 
                            className={`p-4 rounded-xl border transition duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              rec.urgency === "CRITICAL" ? "bg-rose-50/40 border-rose-200 text-rose-950 hover:bg-rose-50" :
                              rec.urgency === "RECOMMENDED" ? "bg-amber-50/20 border-amber-250 text-slate-900 hover:bg-amber-50/40" :
                              "bg-slate-50/60 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="font-mono font-bold text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded select-all shadow-xs">
                                  {rec.sku}
                                </span>
                                <h5 className="font-bold text-xs truncate max-w-xs">{rec.productName}</h5>
                                
                                <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${
                                  rec.urgency === "CRITICAL" ? "bg-rose-100 text-rose-700 border-rose-200 text-[10px] animate-pulse" :
                                  rec.urgency === "RECOMMENDED" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                  "bg-slate-100 text-slate-505 border-slate-250"
                                }`}>
                                  {rec.urgency}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 leading-snug font-medium mb-2.5">
                                {rec.reason}
                              </p>

                              <div className="flex items-center gap-4 flex-wrap text-[10px] text-slate-500 font-semibold">
                                <span className="flex items-center gap-1">
                                  <Store className="h-3.5 w-3.5 text-slate-400" />
                                  Supplier: <span className="text-slate-800 font-bold">{rec.supplierName}</span>
                                </span>
                                <span>•</span>
                                <span>Holding: <span className="text-slate-800 font-bold">{rec.currentLevel} units</span></span>
                                {rec.recommendedOrder > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>Suggested buy: <span className="text-indigo-600 font-bold">{rec.recommendedOrder} units</span></span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Purchase Trigger Tool */}
                            <div className="shrink-0 flex items-center justify-between sm:justify-end sm:flex-col items-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-transparent border-slate-250/20">
                              {rec.recommendedOrder > 0 ? (
                                <>
                                  <div className="text-left sm:text-right">
                                    <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-0.5">ESTIMATED COST</span>
                                    <span className="text-xs font-mono font-extrabold text-slate-900">{costFormatted}</span>
                                  </div>
                                  
                                  <button
                                    id={`procure-audit-btn-${rec.sku}`}
                                    onClick={() => handleRestockOrder(rec.id, rec.sku, rec.recommendedOrder)}
                                    disabled={isProcessing}
                                    className="bg-indigo-605 hover:bg-indigo-705 text-white disabled:bg-slate-300 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer hover:shadow-md transition"
                                  >
                                    <Truck className="h-3.5 w-3.5 shrink-0" />
                                    <span>{isProcessing ? "Ordering..." : "Approve Purchase"}</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 font-bold italic flex items-center gap-1.5 bg-slate-105 border py-1.5 px-3 rounded-lg">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  Holding Healthy Level
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed rounded-lg text-slate-400">
                <BrainCircuit className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold">Ready to launch predictive logs audit</p>
                <p className="text-[10px] mt-1 max-w-xs mx-auto">Click the initialization button above to query advanced stocking recommendations dynamically from Gemini.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "warehouses" && (
          <WarehouseGraphs 
            warehouses={warehouses}
            stats={stats}
            transactions={transactions}
            products={products}
          />
        )}

        {activeTab === "workspace" && (
          <WorkspacePanel products={products} auditReport={auditReport} warehouses={warehouses} />
        )}

      </main>

      {/* FOOTER METRICS SYSTEM */}
      <footer className="bg-white border-t border-slate-205 mt-20 py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span className="font-bold text-slate-800">Three-Layer Architecture Ledger Node</span>
          </div>
          <p className="font-medium text-center md:text-right">
            Authoritative Server State runs in memory via Node.js • Stream sync over SSE
          </p>
        </div>
      </footer>

      {/* ==========================================
          MODAL 1: REGISTER NEW PRODUCT SKU DIALOG
          ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Head */}
            <div className="sticky top-0 bg-white p-5 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Product SKU</h3>
                <p className="text-[11px] text-slate-500">Insert identifiers and cost schemas into central ledger</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body form */}
            <form onSubmit={handleRegisterProduct} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200/70 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">SKU Code (Alphanumeric unique) *</label>
                  <input
                    id="new-sku-input"
                    type="text"
                    required
                    placeholder="e.g. SKU-XT-800"
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2.5 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-550"
                    value={newSku}
                    onChange={e => setNewSku(e.target.value.toUpperCase())}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Product Name *</label>
                  <input
                    id="new-name-input"
                    type="text"
                    required
                    placeholder="e.g. Lithium-Ion Battery Node"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Product Description</label>
                <textarea
                  id="new-desc-input"
                  placeholder="Detail parameters, specifications, tolerances..."
                  rows={2}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">System Category *</label>
                  <input
                    id="new-category-input"
                    type="text"
                    required
                    placeholder="e.g. Power Sources"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    list="categories-list"
                  />
                  <datalist id="categories-list">
                    <option value="Sensors & ICs" />
                    <option value="Power Sources" />
                    <option value="Connectors" />
                    <option value="Packaging" />
                    <option value="Raw Materials" />
                  </datalist>
                </div>

                {/* Warehouse Location Assigned */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Starting Depot Site *</label>
                  <select
                    id="new-warehouse-select"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden bg-white"
                    value={newWarehouseId}
                    onChange={e => setNewWarehouseId(e.target.value)}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity Stock targets */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Initial Qty *</label>
                  <input
                    id="new-level-input"
                    type="number"
                    min={0}
                    className="w-full text-xs rounded-lg border border-slate-305 p-2 font-semibold"
                    value={newLevel}
                    onChange={e => setNewLevel(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Min (Reorder) *</label>
                  <input
                    id="new-reorder-input"
                    type="number"
                    min={0}
                    className="w-full text-xs rounded-lg border border-slate-305 p-2"
                    value={newReorder}
                    onChange={e => setNewReorder(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Max Level *</label>
                  <input
                    id="new-max-input"
                    type="number"
                    min={0}
                    className="w-full text-xs rounded-lg border border-slate-305 p-2"
                    value={newMax}
                    onChange={e => setNewMax(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Pricing metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-505 mb-1">Cost Basis Price ($ USD) *</label>
                  <input
                    id="new-cost-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="15.00"
                    className="w-full text-xs rounded-lg border border-slate-305 p-2.5 font-mono"
                    value={newCost}
                    onChange={e => setNewCost(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-505 mb-1">Wholesale Selling Price ($ USD) *</label>
                  <input
                    id="new-sell-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="39.99"
                    className="w-full text-xs rounded-lg border border-slate-305 p-2.5 font-mono"
                    value={newSell}
                    onChange={e => setNewSell(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Vendor supplier line */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Primary Vendor Supplier *</label>
                <select
                  id="new-supplier-select"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden bg-white"
                  value={newSupplierId}
                  onChange={e => setNewSupplierId(e.target.value)}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Lead: {s.leadTimeDays} days, Rating: {s.rating}★)</option>
                  ))}
                </select>
              </div>

              {/* Bottom Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg text-slate-505 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-705 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: INTER-WAREHOUSE TRANSFER RELOCATOR
          ========================================== */}
      {isTransferModalOpen && transferTargetProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
                  Inter-Warehouse Transshipment
                </h3>
                <p className="text-[11px] text-slate-500">Relocate physical cargo logs between depots</p>
              </div>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-705 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleTransferRelocation} className="p-5 space-y-4">
              
              {transferError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200/75">
                  {transferError}
                </div>
              )}

              {/* Product Info Indicator */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Target Product</span>
                <p className="font-bold text-slate-800 mt-0.5">{transferTargetProduct.name}</p>
                <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                  <span>SKU: <strong className="font-mono text-slate-800">{transferTargetProduct.sku}</strong></span>
                  <span>•</span>
                  <span>Physical Holding: <strong className="text-slate-800">{transferTargetProduct.currentLevel}</strong></span>
                </div>
              </div>

              {/* From / To Warehouses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Source Depot</label>
                  <select
                    id="transfer-from-select"
                    disabled
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-100 text-slate-600 focus:outline-hidden"
                    value={transferSourceWH}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name.split(" - ")[0]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Depot Site *</label>
                  <select
                    id="transfer-to-select"
                    required
                    className="w-full text-xs rounded-lg border border-slate-350 p-2.5 focus:outline-hidden bg-white"
                    value={transferDestWH}
                    onChange={e => setTransferDestWH(e.target.value)}
                  >
                    <option value="">Choose Destination Hub</option>
                    {warehouses.filter(w => w.id !== transferSourceWH).map(w => (
                      <option key={w.id} value={w.id}>{w.name.split(" - ")[0]} ({w.location})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Relocation volume */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1">Transfer Qty Units *</label>
                <div className="flex items-center gap-3">
                  <input
                    id="transfer-qty-input"
                    type="number"
                    required
                    min={1}
                    max={transferTargetProduct.currentLevel}
                    className="w-24 text-xs font-bold rounded-lg border border-slate-300 p-2 ml-px"
                    value={transferQty}
                    onChange={e => setTransferQty(Math.min(transferTargetProduct.currentLevel, Math.max(1, Number(e.target.value))))}
                  />
                  <span className="text-[10px] font-medium text-slate-400">
                    Max allowed: {transferTargetProduct.currentLevel}
                  </span>
                </div>
              </div>

              {/* Freight Note */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cargo Dispatch Notes</label>
                <input
                  id="transfer-notes-input"
                  type="text"
                  placeholder="e.g. Cross-docking to address retail shortages."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 font-semibold hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm cursor-pointer"
                >
                  Discharging Shipment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* FLOAT ACTION LIVE ALERTS TOAST (Presentational Sync Indicator) */}
      {systemMessage && (
        <div id="live-toast-notification" className="fixed bottom-6 right-6 z-55 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 shadow-xl max-w-sm animate-fade-in text-xs transition duration-300">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
          <span className="flex-1 font-semibold leading-relaxed">{systemMessage}</span>
          <button 
            onClick={() => setSystemMessage("")} 
            className="text-slate-400 hover:text-white shrink-0 cursor-pointer ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in print:bg-white print:backdrop-blur-none">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col print:shadow-none print:border-none">
            {/* Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Product QR Label
                </h3>
              </div>
              <button 
                onClick={() => setShowQRModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-705 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center justify-center print:p-0">
              <div id="print-qr-container" className="bg-white p-4 border-2 border-slate-100 rounded-xl mb-4 print:border-none print:p-0 print:mb-2">
                <QRCodeSVG value={selectedProduct.sku} size={180} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm print:text-black">{selectedProduct.name}</p>
                <p className="text-xs font-mono text-slate-500 mt-1 print:text-black">{selectedProduct.sku}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 pb-5 px-6 border-t border-slate-100 flex justify-end gap-2 text-xs print:hidden">
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 font-semibold hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm cursor-pointer"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI CHATBOT INTEGRATION */}
      <Chatbot />

    </div>
  );
}
