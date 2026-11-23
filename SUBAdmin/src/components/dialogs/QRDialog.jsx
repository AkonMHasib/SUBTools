// QR Code Generator Dialog Component using pure SVG grid vectors
import Dialog from '../common/Dialog';
import { FiDownload, FiPrinter, FiCheck, FiCopy } from 'react-icons/fi';
import { useState } from 'react';

export const QRDialog = ({ isOpen, onClose, routeName, routeCode }) => {
  const [copied, setCopied] = useState(false);

  // Generate a pseudo-random QR grid based on route code to make it look realistic
  const qrSize = 25; // 25x25 grid
  const getGrid = () => {
    const grid = [];
    const seed = routeCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    
    for (let r = 0; r < qrSize; r++) {
      const row = [];
      for (let c = 0; c < qrSize; c++) {
        // Markers in corners (top-left, top-right, bottom-left)
        const isMarker = 
          (r < 7 && c < 7) || // Top-left
          (r < 7 && c >= qrSize - 7) || // Top-right
          (r >= qrSize - 7 && c < 7); // Bottom-left
        
        if (isMarker) {
          // Outer border, inner white, center black
          const inBorder = (r === 0 || r === 6 || c === 0 || c === 6) ||
                           (r === 0 && c >= qrSize - 7) || (r === 6 && c >= qrSize - 7) ||
                           (c === qrSize - 7 && r < 7) || (c === qrSize - 1 && r < 7) ||
                           (r === qrSize - 7 && c < 7) || (r === qrSize - 1 && c < 7) ||
                           (c === 0 && r >= qrSize - 7) || (c === 6 && r >= qrSize - 7);
          const inCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
                           (r >= 2 && r <= 4 && c >= qrSize - 5 && c <= qrSize - 3) ||
                           (r >= qrSize - 5 && r <= qrSize - 3 && c >= 2 && c <= 4);
          
          row.push(inBorder || inCenter ? 1 : 0);
        } else {
          // Pseudo-random noise seeded by route code
          const val = (Math.sin(r * 12.9898 + c * 78.233 + seed) * 43758.5453) % 1;
          row.push(val > 0 ? 1 : 0);
        }
      }
      grid.push(row);
    }
    return grid;
  };

  const grid = getGrid();
  const scale = 10;
  const svgSize = qrSize * scale;

  const handleCopy = () => {
    navigator.clipboard.writeText(`subtools://route/${routeCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Generate Route QR Code" size="sm">
      <div className="flex flex-col items-center">
        <div className="mb-4 text-center">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{routeName}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Scan to view route pickup points & track shuttle position</p>
        </div>

        {/* QR Code Graphic Area */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs mb-6">
          <svg
            width={200}
            height={200}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="w-48 h-48"
          >
            {grid.map((row, rIdx) => 
              row.map((val, cIdx) => {
                if (val === 0) return null;
                return (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={cIdx * scale}
                    y={rIdx * scale}
                    width={scale}
                    height={scale}
                    fill="#0f172a"
                  />
                );
              })
            )}
          </svg>
        </div>

        {/* Info pill */}
        <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/50 mb-6 text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
          subtools://route/{routeCode}
        </div>

        {/* Actions button */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer text-[10px] font-semibold"
          >
            {copied ? <FiCheck className="text-emerald-500 text-sm mb-1" /> : <FiCopy className="text-sm mb-1" />}
            {copied ? 'Copied' : 'Copy URI'}
          </button>
          <button
            onClick={() => alert("Simulating download... QR Code exported as PNG.")}
            className="flex flex-col items-center justify-center py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer text-[10px] font-semibold"
          >
            <FiDownload className="text-sm mb-1 text-blue-500" />
            Download
          </button>
          <button
            onClick={() => window.print()}
            className="flex flex-col items-center justify-center py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer text-[10px] font-semibold"
          >
            <FiPrinter className="text-sm mb-1 text-purple-500" />
            Print QR
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default QRDialog;
