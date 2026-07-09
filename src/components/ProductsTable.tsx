/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Search, Plus, Minus, Filter, CornerUpRight, ShoppingCart, HelpCircle, CheckSquare, Square, Truck, Check, Camera } from "lucide-react";
import { Product, Warehouse, Supplier, StockStatus, TransactionType } from "../types";
import { getAccessToken } from "../lib/firebase";
import BarcodeScanner from "./BarcodeScanner";

interface ProductsTableProps {
  products: Product[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  userRole: string;
  onQuickAdjust: (productId: string, type: TransactionType.RECEIVED | TransactionType.DISPATCHED, qty: number, comments: string) => void;
  onSelectProduct: (product: Product) => void;
  onOpenRelocate: (product: Product) => void;
}

export default function ProductsTable({ 
  products, 
  warehouses, 
  suppliers, 
  userRole,
  onQuickAdjust, 
  onSelectProduct,
  onOpenRelocate
}: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  
  // Local state for single item quick-adjust panel
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustNote, setAdjustNote] = useState("");

  // Bulk action states
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [bulkAdjustType, setBulkAdjustType] = useState<TransactionType.RECEIVED | TransactionType.DISPATCHED>(TransactionType.RECEIVED);
  const [bulkAdjustQty, setBulkAdjustQty] = useState(10);
  const [bulkAdjustNote, setBulkAdjustNote] = useState("Bulk adjustment");

  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [bulkTransferDestWH, setBulkTransferDestWH] = useState("");
  const [bulkTransferQty, setBulkTransferQty] = useState(10);
  const [bulkTransferNote, setBulkTransferNote] = useState("Bulk inter-warehouse transfer");

  const [isBulkCategoryOpen, setIsBulkCategoryOpen] = useState(false);
  const [bulkCategoryDest, setBulkCategoryDest] = useState("");

  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const categories = Array.from(new Set(products.map(p => p.category)));

  // Filter items
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku.toLowerCase().includes(search.toLowerCase()) ||
                          p.category.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse = selectedWarehouseId ? p.warehouseId === selectedWarehouseId : true;
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    const matchesStatus = selectedStatus ? p.status === selectedStatus : true;
    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleSelectRow = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setSelectedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleExecuteBulkAdjust = () => {
    selectedProductIds.forEach(id => {
      onQuickAdjust(id, bulkAdjustType, bulkAdjustQty, bulkAdjustNote);
    });
    setIsBulkAdjustOpen(false);
    setSelectedProductIds([]);
  };

  const handleExecuteBulkCategory = async () => {
    if (!bulkCategoryDest) return;
    setBulkProcessing(true);
    const token = await getAccessToken();
    try {
      await fetch("/api/inventory/product/bulk-update", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          productIds: selectedProductIds,
          updates: { category: bulkCategoryDest }
        })
      });
    } catch (err) {
      console.error("Bulk category error:", err);
    }
    setBulkProcessing(false);
    setIsBulkCategoryOpen(false);
    setSelectedProductIds([]);
  };

  const handleExecuteBulkTransfer = async () => {
    if (!bulkTransferDestWH) return;
    setBulkProcessing(true);
    const token = await getAccessToken();
    for (const id of selectedProductIds) {
      const p = products.find(prod => prod.id === id);
      if (!p || p.warehouseId === bulkTransferDestWH || p.currentLevel < bulkTransferQty) continue;
      
      try {
        await fetch("/api/inventory/transfer", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            productId: id,
            fromWarehouseId: p.warehouseId,
            toWarehouseId: bulkTransferDestWH,
            quantity: bulkTransferQty,
            operator: "Bulk Automation",
            notes: bulkTransferNote
          })
        });
      } catch (err) {
        console.error("Bulk transfer error:", err);
      }
    }
    setBulkProcessing(false);
    setIsBulkTransferOpen(false);
    setSelectedProductIds([]);
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case StockStatus.IN_STOCK:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">In Stock</span>;
      case StockStatus.LOW_STOCK:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">Low Stock</span>;
      case StockStatus.OUT_OF_STOCK:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Depleted</span>;
      case StockStatus.OVERSTOCKED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Overstocked</span>;
    }
  };

  const handleExecuteQuick = (pId: string, type: TransactionType.RECEIVED | TransactionType.DISPATCHED) => {
    if (adjustQty <= 0) return;
    onQuickAdjust(pId, type, adjustQty, adjustNote.trim() || `Supervisor quick-adjust.`);
    setAdjustingProductId(null);
    setAdjustNote("");
  };

  const handleSelectProductBySku = (decodedText: string) => {
    setIsScannerOpen(false);
    const matched = products.find(p => p.sku === decodedText || p.id === decodedText);
    if (matched) {
      setSearch(matched.sku);
      onSelectProduct(matched);
    } else {
      setSearch(decodedText);
    }
  };

  return (
    <div id="product-catalog-panel" className="bg-white rounded-xl border border-slate-200/85 shadow-xs overflow-hidden mb-8 relative">
      {/* Floating Scan Button */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="absolute bottom-6 right-6 z-10 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
        title="Scan Barcode"
      >
        <Camera className="w-6 h-6" />
      </button>

      {/* Search & Filtering Bar */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Stock SKU Catalog</h3>
            <p className="text-xs text-slate-500">Search and adjust central product levels</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search string inputs */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  id="catalog-search-input"
                  type="text"
                  placeholder="Search SKU, name, profile..."
                  className="w-64 pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                title="Scan Barcode"
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Warehouse Filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-slate-400" />
              <select
                id="filter-warehouse-select"
                className="text-xs bg-white rounded-lg border border-slate-200 p-2 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <select
              id="filter-category-select"
              className="text-xs bg-white rounded-lg border border-slate-200 p-2 focus:outline-hidden"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="filter-status-select"
              className="text-xs bg-white rounded-lg border border-slate-200 p-2 focus:outline-hidden"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value={StockStatus.IN_STOCK}>In Stock</option>
              <option value={StockStatus.LOW_STOCK}>Low Stock</option>
              <option value={StockStatus.OUT_OF_STOCK}>Depleted</option>
              <option value={StockStatus.OVERSTOCKED}>Overstocked</option>
            </select>

            {/* Reset Filters */}
            {(search || selectedWarehouseId || selectedCategory || selectedStatus) && (
              <button 
                id="reset-filters-btn"
                onClick={() => {
                  setSearch("");
                  setSelectedWarehouseId("");
                  setSelectedCategory("");
                  setSelectedStatus("");
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-indigo-50 border-b border-indigo-100 p-3 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-full">
              {selectedProductIds.length} items selected
            </span>
            <button 
              onClick={() => setSelectedProductIds([])}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => { setIsBulkAdjustOpen(true); setIsBulkTransferOpen(false); setIsBulkCategoryOpen(false); }}
              className="text-xs font-bold px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 shadow-xs cursor-pointer flex items-center gap-1.5 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Bulk Status Adjust
            </button>
            {userRole !== 'Viewer' && (
              <>
                <button
                  onClick={() => { setIsBulkCategoryOpen(true); setIsBulkTransferOpen(false); setIsBulkAdjustOpen(false); }}
                  className="text-xs font-bold px-4 py-2 rounded-lg border border-transparent text-white bg-indigo-500 hover:bg-indigo-600 shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Category Tag
                </button>
                <button
                  onClick={() => { setIsBulkTransferOpen(true); setIsBulkAdjustOpen(false); setIsBulkCategoryOpen(false); }}
                  className="text-xs font-bold px-4 py-2 rounded-lg border border-transparent text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Truck className="h-3.5 w-3.5" /> Bulk Relocate
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Category Tag Inline Form */}
      {isBulkCategoryOpen && selectedProductIds.length > 0 && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 px-6 flex flex-col md:flex-row gap-4 items-end animate-in fade-in zoom-in-95 duration-200">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Select New Category</label>
            <input
              type="text"
              placeholder="e.g. Raw Materials, Assembly, etc."
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white"
              value={bulkCategoryDest}
              onChange={e => setBulkCategoryDest(e.target.value)}
              list="categories-list-bulk"
            />
            <datalist id="categories-list-bulk">
              {categories.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsBulkCategoryOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">Cancel</button>
            <button onClick={handleExecuteBulkCategory} disabled={!bulkCategoryDest || bulkProcessing} className="px-4 py-2 text-xs font-bold text-white bg-indigo-500 rounded-lg shadow-sm cursor-pointer hover:bg-indigo-600 disabled:opacity-50">
              {bulkProcessing ? "Processing..." : "Update Category"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Transfer Inline Form */}
      {isBulkTransferOpen && selectedProductIds.length > 0 && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 px-6 flex flex-col md:flex-row gap-4 items-end animate-in fade-in zoom-in-95 duration-200">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Destination Warehouse</label>
            <select
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden bg-white"
              value={bulkTransferDestWH}
              onChange={e => setBulkTransferDestWH(e.target.value)}
            >
              <option value="">Select Target Depot</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Qty per item</label>
            <input
              type="number"
              min={1}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 font-bold"
              value={bulkTransferQty}
              onChange={e => setBulkTransferQty(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Transfer Notes</label>
            <input
              type="text"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
              value={bulkTransferNote}
              onChange={e => setBulkTransferNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsBulkTransferOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">Cancel</button>
            <button onClick={handleExecuteBulkTransfer} disabled={!bulkTransferDestWH || bulkProcessing} className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg shadow-sm cursor-pointer hover:bg-indigo-700 disabled:opacity-50">
              {bulkProcessing ? "Processing..." : "Confirm Transfers"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Adjust Inline Form */}
      {isBulkAdjustOpen && selectedProductIds.length > 0 && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 px-6 flex flex-col md:flex-row gap-4 items-end animate-in fade-in zoom-in-95 duration-200">
          <div className="w-48">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Operation Type</label>
            <select
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-hidden bg-white"
              value={bulkAdjustType}
              onChange={e => setBulkAdjustType(e.target.value as TransactionType)}
            >
              <option value={TransactionType.RECEIVED}>Receive Stock (+)</option>
              <option value={TransactionType.DISPATCHED}>Dispatch Stock (-)</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Qty per item</label>
            <input
              type="number"
              min={1}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 font-bold"
              value={bulkAdjustQty}
              onChange={e => setBulkAdjustQty(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Adjustment Notes</label>
            <input
              type="text"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5"
              value={bulkAdjustNote}
              onChange={e => setBulkAdjustNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsBulkAdjustOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">Cancel</button>
            <button onClick={handleExecuteBulkAdjust} className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg shadow-sm cursor-pointer hover:bg-emerald-700">
              Apply Adjustments
            </button>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-4 px-6 w-12 text-center">
                <button 
                  onClick={handleSelectAll} 
                  className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                >
                  {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="py-4 px-6">SKU Code</th>
              <th className="py-4 px-6">Product Details</th>
              <th className="py-4 px-6 text-center">Current Levels</th>
              <th className="py-4 px-6">Valuation (Cost/Sell)</th>
              <th className="py-4 px-6">Warehouse Hub</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Operational Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 px-6">
                  <p className="text-xs text-slate-500 mb-1 font-medium">No results matched your filter conditions.</p>
                  <p className="text-[11px] text-slate-400">Try loosening your search query or warehouse selectors.</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => {
                const wh = warehouses.find(w => w.id === p.warehouseId);
                const isQuickPanelOpen = adjustingProductId === p.id;
                const isSelected = selectedProductIds.includes(p.id);

                const valFormatted = new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(p.currentLevel * p.cost);

                return (
                  <React.Fragment key={p.id}>
                    <tr className={`hover:bg-slate-50/70 transition-colors group cursor-pointer ${isSelected ? "bg-indigo-50/30" : ""}`}>
                      {/* Checkbox */}
                      <td className="py-4 px-6 text-center w-12" onClick={(e) => handleSelectRow(e, p.id)}>
                        <button className={`transition cursor-pointer ${isSelected ? "text-indigo-600" : "text-slate-300 group-hover:text-slate-400"}`}>
                          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>

                      {/* SKU Code */}
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-800 select-all" onClick={() => onSelectProduct(p)}>
                        {p.sku}
                      </td>

                      {/* Product details */}
                      <td className="py-4 px-6 max-w-sm" onClick={() => onSelectProduct(p)}>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition">{p.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.description}</p>
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                      </td>

                      {/* Current Stock Levels */}
                      <td className="py-4 px-6 text-center" onClick={() => onSelectProduct(p)}>
                        <div>
                          <span className="text-sm font-bold text-slate-900">{p.currentLevel}</span>
                          <span className="text-slate-400 text-xs"> / {p.maxStock}</span>
                        </div>
                        <div className="w-24 bg-slate-100 h-1 rounded-full mt-1.5 mx-auto overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${p.status === StockStatus.OUT_OF_STOCK ? "bg-rose-500" : p.status === StockStatus.LOW_STOCK ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, (p.currentLevel / p.maxStock) * 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Valuation */}
                      <td className="py-4 px-6 text-xs text-slate-700" onClick={() => onSelectProduct(p)}>
                        <p className="font-semibold text-slate-800">{valFormatted}</p>
                        <p className="text-[9px] text-slate-400">Cost: ${p.cost} | Wholesale: ${p.sellPrice}</p>
                      </td>

                      {/* Warehouse Hub */}
                      <td className="py-4 px-6 text-xs text-slate-800" onClick={() => onSelectProduct(p)}>
                        <p className="font-semibold">{wh?.name.split(" - ")[0] || "Transit Node"}</p>
                        <p className="text-[9px] text-slate-400">{wh?.location}</p>
                      </td>

                      {/* Match Status */}
                      <td className="py-4 px-6" onClick={() => onSelectProduct(p)}>
                        {getStatusBadge(p.status)}
                      </td>

                      {/* Action buttons (Manual changes) */}
                      <td className="py-4 px-6 text-right text-xs">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* Quick Adjust Toggle */}
                          <button
                            id={`quick-adjust-toggle-${p.sku}`}
                            title="Quick Adjust Unit Stocks"
                            onClick={() => setAdjustingProductId(isQuickPanelOpen ? null : p.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                          >
                            <span>Adjust</span>
                          </button>

                          {/* Warehouse Relocate */}
                          {userRole !== 'Viewer' && (
                            <button
                              id={`quick-transfer-${p.sku}`}
                              title="Relocate Stock Hubs"
                              onClick={() => onOpenRelocate(p)}
                              className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                            >
                              <CornerUpRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDABLE QUICK PANELS */}
                    {isQuickPanelOpen && (
                      <tr className="bg-indigo-50/40 border-l-4 border-l-indigo-500">
                        <td colSpan={8} className="p-4 px-8">
                          <div className="flex flex-col md:flex-row items-baseline md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-indigo-900">Rapid Stock Audit:</span>
                              <input
                                type="number"
                                className="w-16 bg-white border border-slate-200 rounded py-1 px-1.5 text-xs focus:outline-hidden font-bold"
                                value={adjustQty}
                                onChange={e => setAdjustQty(Math.max(1, Number(e.target.value)))}
                              />
                              <input
                                type="text"
                                placeholder="Adjustment comments (optional)..."
                                className="w-64 bg-white border border-slate-200 rounded py-1 px-2.5 text-xs focus:outline-hidden"
                                value={adjustNote}
                                onChange={e => setAdjustNote(e.target.value)}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Receive Button */}
                              <button
                                id={`quick-adjust-receive-${p.sku}`}
                                onClick={() => handleExecuteQuick(p.id, TransactionType.RECEIVED)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded text-xs leading-none flex items-center gap-1 cursor-pointer shadow-xs transition"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Receive Stock</span>
                              </button>

                              {/* Dispatch Button */}
                              <button
                                id={`quick-adjust-dispatch-${p.sku}`}
                                onClick={() => handleExecuteQuick(p.id, TransactionType.DISPATCHED)}
                                disabled={p.currentLevel < adjustQty}
                                className={`font-bold py-1 px-3 rounded text-xs leading-none flex items-center gap-1 transition shadow-xs ${p.currentLevel < adjustQty ? "bg-slate-200 text-slate-400 cursor-not-allowed border" : "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"}`}
                              >
                                <Minus className="h-3 w-3" />
                                <span>Dispatch Stock</span>
                              </button>

                              <button
                                onClick={() => setAdjustingProductId(null)}
                                className="text-xs text-slate-500 hover:underline px-2 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {isScannerOpen && (
        <BarcodeScanner 
          onScanSuccess={handleSelectProductBySku}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}

