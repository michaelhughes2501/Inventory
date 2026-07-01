/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Database, Home, Info, Archive } from "lucide-react";
import { Warehouse, InventoryStats, Transaction, Product } from "../types";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface WarehouseGraphsProps {
  warehouses: Warehouse[];
  stats: InventoryStats;
  transactions: Transaction[];
  products: Product[];
}

export default function WarehouseGraphs({ warehouses, stats, transactions, products }: WarehouseGraphsProps) {
  // Category distribution calculation
  const categories = Object.keys(stats.categoryDistribution || {});
  const maxCategoryVol = Math.max(...categories.map(c => stats.categoryDistribution[c]), 1);

  // Status-based color ranges for warehouse utilization
  const getUtilColorClass = (percentage: number) => {
    if (percentage > 90) return { bar: "bg-rose-500", text: "text-rose-600 font-semibold" };
    if (percentage > 75) return { bar: "bg-orange-500", text: "text-orange-600" };
    return { bar: "bg-indigo-600", text: "text-slate-600" };
  };

  // Find top 10 most frequent items
  const itemFreq: Record<string, number> = {};
  transactions.forEach(t => {
    itemFreq[t.productName] = (itemFreq[t.productName] || 0) + 1;
  });
  const top10 = Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a]).slice(0, 10);
  
  // Create chart data based on transaction volume trend
  const chartData = transactions.slice(-50).map(t => {
    const time = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const point: any = { time };
    if (top10.includes(t.productName)) {
      point[t.productName] = t.quantity;
    }
    return point;
  });
  
  const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];

  return (
    <div className="flex flex-col gap-8 mb-8">
      {/* PANEL 3: Top 10 Trend */}
      <div id="historical-trend-panel" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs h-96 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historical Trend (Top 10 Activity)</h3>
            <p className="text-xs text-slate-500">Transaction volume trend for most active SKUs</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px' }}
                labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
              />
              {top10.map((item, idx) => (
                <Area key={item} type="monotone" dataKey={item} stroke={colors[idx]} fill={colors[idx]} fillOpacity={0.1} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* PANEL 1: Depot Capacity Utilizations */}
      <div id="warehouse-utilization-panel" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Depot Hub Capacities</h3>
            <p className="text-xs text-slate-500">Real-time physical storage allocations</p>
          </div>
          <Database className="h-5 w-5 text-indigo-500" />
        </div>

        <div className="space-y-6">
          {warehouses.map(w => {
            const utilization = stats.warehouseUtilizations[w.id] || { used: 0, total: w.capacitySku, percentage: 0 };
            const styleProps = getUtilColorClass(utilization.percentage);

            return (
              <div key={w.id} className="group">
                <div className="flex justify-between items-baseline mb-2">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" />
                    <span className="text-sm font-semibold text-slate-850">{w.name}</span>
                    <span className="text-xs text-slate-405">({w.location})</span>
                  </div>
                  <div className="text-xs text-right">
                    <span className="font-bold text-slate-900">{utilization.used}</span>
                    <span className="text-slate-400"> / {utilization.total} Units </span>
                    <span className={`ml-2 px-2 py-0.5 rounded bg-slate-105 ${styleProps.text}`}>
                      {utilization.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/20">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ease-out ${styleProps.bar}`}
                    style={{ width: `${utilization.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200/40 flex gap-2.5 items-start">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Automatic overflow flag activates if any single hub reaches 90% utilization. Consolidate inventory with transfer tools if thresholds alert.
          </p>
        </div>
      </div>

      {/* PANEL 2: Distribution by Category */}
      <div id="category-distribution-panel" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Category Allocations</h3>
            <p className="text-xs text-slate-500">Units aggregated by product scope</p>
          </div>
          <Archive className="h-5 w-5 text-indigo-505" />
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg border border-dashed">
            <p className="text-xs text-slate-500">No category categories deployed to registries yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map(cat => {
              const qty = stats.categoryDistribution[cat];
              const pctOfMax = Math.round((qty / maxCategoryVol) * 100);

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-medium text-slate-700">{cat}</span>
                    <span className="font-bold text-slate-900">{qty} units</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500/80 rounded-lg transition-all duration-700 ease-out"
                        style={{ width: `${pctOfMax}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                      {pctOfMax}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-150 flex justify-around text-center text-xs">
          <div>
            <span className="block text-lg font-bold text-slate-900">{categories.length}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Categories</span>
          </div>
          <div className="border-r border-slate-200 h-8 self-center" />
          <div>
            <span className="block text-lg font-bold text-slate-900">
              {Object.values(stats.categoryDistribution || {}).reduce((sum, val) => sum + val, 0)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Stock Units</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
