import React, { useState, useMemo } from "react";
import { Product, InventoryStats, AuditTrailLog, Warehouse } from "../types";
import { FileText, ShieldAlert, DollarSign, Activity, Filter, Clock } from "lucide-react";

interface ReportingDashboardProps {
  products: Product[];
  stats: InventoryStats;
  auditLogs: AuditTrailLog[];
  warehouses: Warehouse[];
}

export default function ReportingDashboard({ products, stats, auditLogs, warehouses }: ReportingDashboardProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterLocation, setFilterLocation] = useState<string>("ALL");

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = filterCategory === "ALL" || p.category === filterCategory;
      const matchLoc = filterLocation === "ALL" || p.warehouseId === filterLocation;
      return matchCat && matchLoc;
    });
  }, [products, filterCategory, filterLocation]);

  const filteredStats = useMemo(() => {
    const lowStock = filteredProducts.filter(p => p.currentLevel <= p.reorderPoint).length;
    const value = filteredProducts.reduce((sum, p) => sum + (p.currentLevel * p.cost), 0);
    return {
      totalItems: filteredProducts.length,
      lowStockCount: lowStock,
      inventoryValue: value
    };
  }, [filteredProducts]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <Filter className="h-5 w-5 text-slate-400" />
        <div className="flex gap-4 items-center">
          <select 
            className="text-sm border border-slate-300 rounded-lg p-2 bg-slate-50"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="text-sm border border-slate-300 rounded-lg p-2 bg-slate-50"
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
          >
            <option value="ALL">All Locations</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Items (Filtered)</p>
            <p className="text-2xl font-bold text-slate-900">{filteredStats.totalItems}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Below Reorder Point</p>
            <p className="text-2xl font-bold text-slate-900">{filteredStats.lowStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Inventory Value (Cost)</p>
            <p className="text-2xl font-bold text-slate-900">${filteredStats.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-500" />
          <h3 className="font-bold text-slate-900">System Audit Trail</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No audit logs available.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">User</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Entity</th>
                  <th className="p-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-900 font-medium">{log.user}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-xs font-bold">{log.entityType} ({log.entityId.slice(0, 8)})</td>
                    <td className="p-3 text-slate-700">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
