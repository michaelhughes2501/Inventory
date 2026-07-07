/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Database, Home, Info, Archive } from "lucide-react";
import { Warehouse, InventoryStats, Transaction, Product, TransactionType } from "../types";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

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

  // Calculate total inventory over time based on transactions
  const currentTotal = products.reduce((sum, p) => sum + p.currentLevel, 0);
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const inventoryLevelData = [{ time: "Now", total: currentTotal }];
  let runningTotal = currentTotal;

  sortedTransactions.slice(0, 50).forEach(t => {
    if (t.type === TransactionType.RECEIVED || t.type === TransactionType.ADJUSTED) {
      runningTotal -= t.quantity;
    } else if (t.type === TransactionType.DISPATCHED || t.type === TransactionType.RELOCATED) {
      runningTotal += t.quantity;
    }
    
    inventoryLevelData.unshift({
      time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: runningTotal
    });
  });
  
  const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];

  return (
    <div className="flex flex-col gap-8 mb-8">
      {/* PANEL 3: Total Inventory Trend */}
      <div id="historical-trend-panel" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs h-96 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Inventory Level Over Time</h3>
            <p className="text-xs text-slate-500">Cumulative total stock across all active hubs</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={inventoryLevelData}>
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px' }}
                labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
              />
              <Line type="monotone" dataKey="total" name="Total Units" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
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
                    <span className="text-sm font-semibold text-slate-800">{w.name}</span>
                    <span className="text-xs text-slate-400">({w.location})</span>
                  </div>
                  <div className="text-xs text-right">
                    <span className="font-bold text-slate-900">{utilization.used}</span>
                    <span className="text-slate-400"> / {utilization.total} Units </span>
                    <span className={`ml-2 px-2 py-0.5 rounded bg-slate-100 ${styleProps.text}`}>
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
      <div id="category-distribution-panel" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Category Distribution</h3>
            <p className="text-xs text-slate-500">Units aggregated by product scope</p>
          </div>
          <Archive className="h-5 w-5 text-indigo-500" />
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg border border-dashed flex-1">
            <p className="text-xs text-slate-500">No category categories deployed to registries yet.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories.map((cat) => ({ name: cat, value: stats.categoryDistribution[cat] }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categories.map((cat, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-around text-center text-xs">
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
