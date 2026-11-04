import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Flashlight, RefreshCw, Barcode, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { playScanBeep, playWarningTone } from '../services/sound';
import { Product } from '../types/pos';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  products?: Product[];
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  products = [],
  title = 'Scan Barcode',
  subtitle = 'Point camera at product barcode or choose a quick sample',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'sokos-barcode-reader-view';

  // Handle successful barcode recognition
  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Prevent immediate duplicate fires within 1 second for same code
    if (lastScannedCode === cleanCode && continuousMode) {
      return;
    }

    playScanBeep();
    setLastScannedCode(cleanCode);

    // Find product name if matched
    const matched = products.find(p => p.barcode === cleanCode || p.sku.toLowerCase() === cleanCode.toLowerCase());
    setScanFeedback(matched ? `Scanned: ${matched.name}` : `Scanned Barcode: ${cleanCode}`);

    onScan(cleanCode);

    setTimeout(() => {
      setLastScannedCode(null);
    }, 1200);

    if (!continuousMode) {
      stopCamera();
      onClose();
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const qrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.333,
      };

      await qrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Frame scan error (normal while hunting for barcode)
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera failed to start:', err);
      setCameraActive(false);
      setCameraError(err?.message || 'Could not access camera. Please allow camera permissions or use the quick scanner buttons below.');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !cameraActive) return;
    try {
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch {
      // Torch not supported on device
    }
  };

  // Mount/Unmount camera based on modal visibility
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM element exists
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
      setScanFeedback(null);
      setManualCode('');
    }
  }, [isOpen]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeDetected(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Camera Viewfinder */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
            <div id={scannerContainerId} className="w-full h-full" />

            {/* Target Laser Overlay Guide */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 h-36 border-2 border-dashed border-emerald-400/70 rounded-lg relative flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  {/* Glowing Laser Red/Green line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
                  
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                </div>
                <span className="mt-2 text-[11px] font-mono font-medium text-emerald-300/90 bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Align barcode inside frame
                </span>
              </div>
            )}

            {/* Camera Error / Fallback State */}
            {cameraError && !cameraActive && (
              <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Camera Unavailable</p>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    {cameraError}
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Camera
                </button>
              </div>
            )}

            {/* Camera Controls Bar */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
              <button
                onClick={toggleTorch}
                disabled={!cameraActive}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 backdrop-blur-md transition ${
                  torchOn ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-900/80 text-slate-300 hover:text-white'
                }`}
              >
                <Flashlight className="w-3.5 h-3.5" />
                {torchOn ? 'Torch On' : 'Torch'}
              </button>

              <button
                onClick={() => setContinuousMode(!continuousMode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 backdrop-blur-md transition ${
                  continuousMode ? 'bg-emerald-600/90 text-white font-semibold' : 'bg-slate-900/80 text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {continuousMode ? 'Multi-Scan On' : 'Single-Scan'}
              </button>

              <button
                onClick={() => {
                  stopCamera();
                  startCamera();
                }}
                className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white backdrop-blur-md transition"
                title="Restart Camera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {scanFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2 text-emerald-300 text-xs font-mono animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate flex-1 font-semibold">{scanFeedback}</span>
            </div>
          )}

          {/* Manual Barcode Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type or paste barcode (e.g. 600100100101)..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium font-mono transition flex-shrink-0"
            >
              Enter
            </button>
          </form>

          {/* Quick Barcode Simulator for Easy Desktop/Testing */}
          <div className="border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Quick Test Simulator Barcodes
              </span>
              <span className="text-[10px] text-slate-500">1-click to simulate laser scan</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {products.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleBarcodeDetected(p.barcode)}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/70 hover:bg-emerald-950/60 hover:border-emerald-500/50 border border-slate-700/60 text-left transition group"
                >
                  <div className="truncate mr-1">
                    <p className="text-xs font-medium text-slate-200 truncate group-hover:text-emerald-300">
                      {p.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {p.barcode}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 flex-shrink-0">
                    ${p.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">Supports USB Laser Guns & Cameras</span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
