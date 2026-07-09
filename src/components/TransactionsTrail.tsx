/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Circle, User, MapPin, ClipboardList, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Transaction, TransactionType } from "../types";

interface TransactionsTrailProps {
  transactions: Transaction[];
  onSelectProductBySku: (sku: string) => void;
}

export default function TransactionsTrail({ transactions, onSelectProductBySku }: TransactionsTrailProps) {
  
  const getTransactionStyles = (type: TransactionType) => {
    switch (type) {
      case TransactionType.RECEIVED:
        return {
          bullet: "bg-emerald-500 ring-emerald-200",
          text: "text-emerald-700",
          badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "LANDED"
        };
      case TransactionType.DISPATCHED:
        return {
          bullet: "bg-rose-500 ring-rose-200",
          text: "text-rose-700",
          badge: "bg-rose-50 text-rose-800 border-rose-200",
          label: "DISPATCHED"
        };
      case TransactionType.RELOCATED:
        return {
          bullet: "bg-indigo-500 ring-indigo-200",
          text: "text-indigo-700",
          badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
          label: "TRANSFER"
        };
      case TransactionType.ADJUSTED:
        return {
          bullet: "bg-amber-500 ring-amber-200",
          text: "text-amber-700",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          label: "ADJUSTMENT"
        };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return "00:00:00";
    }
  };

  return (
    <div id="transactions-log-panel" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Real-Time Audit Trail
          </h3>
          <p className="text-xs text-slate-500">Streaming warehouse operations chronologically</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full animate-pulse border border-indigo-200/50">
          <Circle className="h-2 w-2 bg-indigo-500 rounded-full shrink-0" />
          <span>LISTENING</span>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-lg border border-dashed text-slate-400">
          <ClipboardList className="h-10 w-10 text-slate-300 mb-2" />
          <p className="text-xs font-medium">No recorded movements.</p>
          <p className="text-[10px]">Execute a product transaction to seed. </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <AnimatePresence initial={false}>
            {transactions.map((tx) => {
              const styles = getTransactionStyles(tx.type);

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: -15, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100 hover:bg-slate-50 hover:shadow-xs transition duration-150 flex items-start gap-3.5 relative overflow-hidden"
                >
                  {/* Indicator Dot */}
                  <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ring-4 ${styles.bullet}`} />

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span 
                        onClick={() => onSelectProductBySku(tx.sku)}
                        className="text-xs font-extrabold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer truncate"
                      >
                        {tx.sku} - {tx.productName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                        {formatTime(tx.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug mb-2 font-medium">{tx.notes}</p>

                    <div className="flex gap-2 flex-wrap items-center text-[10px]">
                      {/* Operation type badge */}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${styles.badge}`}>
                        {styles.label}
                      </span>

                      {/* Quantity */}
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-extrabold">
                        Qty: {tx.quantity}
                      </span>

                      {/* Operator info */}
                      <span className="text-slate-500 font-medium flex items-center gap-0.5">
                        <User className="h-3 w-3 inline text-slate-400 shrink-0" />
                        {tx.operator}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="shrink-0 mt-3 p-2.5 bg-slate-100/50 rounded-lg text-[10px] text-slate-500 border border-slate-100 flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span>Click on any SKU code above to locate the catalog record instantly.</span>
      </div>
    </div>
  );
}
