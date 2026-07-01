/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Package, ShieldAlert, BadgeDollarSign, Activity, Database, AlertOctagon } from "lucide-react";
import { InventoryStats } from "../types";

interface DashboardStatsProps {
  stats: InventoryStats;
  isLive: boolean;
  onToggleSimulation: () => void;
  isSimulationActive: boolean;
  userRole: string;
}

export default function DashboardStats({ stats, isLive, onToggleSimulation, isSimulationActive, userRole }: DashboardStatsProps) {
  const valuationFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(stats.totalAssetsValuation);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* CARD 1: Inventory Assets */}
      <div id="stat-assets-card" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs hover:border-slate-300 transition duration-150">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inventory Asset Capital</span>
          <div className="p-2.5 bg-emerald-55 text-emerald-650 rounded-lg">
            <BadgeDollarSign className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{valuationFormatted}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            Authoritative cost-basis evaluation
          </p>
        </div>
      </div>

      {/* CARD 2: Turnover Rate */}
      <div id="stat-turnover-card" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs hover:border-slate-300 transition duration-150">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qtr Stock Turnover</span>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <Package className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{stats.turnoverRate || 0}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500"></span>
            Simulated rate based on dispatches
          </p>
        </div>
      </div>

      {/* CARD 3: Low & Out-of-Stock */}
      <div id="stat-low-stock-card" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs hover:border-slate-300 transition duration-150">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stock Alerts & Depletions</span>
          <div className="p-2.5 bg-orange-50 text-orange-650 rounded-lg">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-slate-950">{stats.lowStockCount}</span>
            <span className="text-xs font-medium text-slate-500">low stock</span>
            <span className="text-slate-300">/</span>
            <span className="text-xl font-bold text-rose-600">{stats.outOfStockCount}</span>
            <span className="text-xs font-medium text-slate-500">depleted</span>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            {stats.outOfStockCount > 0 ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-rose-650 font-medium">Critical action recommended</span>
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-orange-400"></span>
                Restocks automatically monitored
              </>
            )}
          </p>
        </div>
      </div>

      {/* CARD 4: Live Synchronization Node */}
      <div id="stat-sync-card" className="bg-slate-950 text-white rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Database className="h-32 w-32 -mr-10 -mt-10" />
        </div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Sync Cluster</span>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${isLive ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isLive ? "bg-cyan-400 animate-ping" : "bg-red-500"}`}></span>
            {isLive ? "LIVE" : "OFFLINE"}
          </div>
        </div>
        <div className="relative z-10">
          <h3 className="text-sm font-semibold mb-1">Event Dispatch Simulator</h3>
          <p className="text-xs text-slate-400 mb-4 h-8 overflow-hidden line-clamp-2">
            Pushes warehouse customer checkouts and cargo landings dynamically.
          </p>
          {userRole === 'Administrator' && (
            <button 
              id="toggle-simulator-btn"
              onClick={onToggleSimulation} 
              className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${isSimulationActive ? "bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800" : "bg-cyan-550 hover:bg-cyan-500 text-slate-950 font-bold"}`}
            >
              <Activity className="h-3.5 w-3.5" />
              {isSimulationActive ? "Pause Background Orders" : "Resume Live Orders"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
