import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { X, Camera } from "lucide-react";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScanSuccess, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      false
    );

    const onSuccess = (decodedText: string) => {
      scanner.clear();
      onScanSuccess(decodedText);
    };

    const onError = (errorMessage: string) => {
      // Ignored to prevent spamming errors while it's searching for a code
    };

    try {
      scanner.render(onSuccess, onError);
    } catch (err: any) {
      setError(err.message || "Could not start camera.");
    }

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Scan Product Barcode</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col items-center">
          {error && <div className="text-xs text-red-500 mb-4">{error}</div>}
          <div id="reader" className="w-full h-auto min-h-[300px] border-2 border-dashed border-slate-200 rounded-xl overflow-hidden"></div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Point your camera at a barcode to automatically populate the SKU in the Quick Adjust panel.
          </p>
        </div>
      </div>
    </div>
  );
}
