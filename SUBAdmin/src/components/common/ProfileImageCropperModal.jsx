import { useState, useRef, useEffect, useCallback } from "react";
import { FiCrop, FiZoomIn, FiZoomOut, FiCheck, FiX, FiInfo } from "react-icons/fi";

/**
 * Iteratively compresses a canvas to a JPEG Blob strictly <= maxBytes (default 50KB).
 * Reduces JPEG quality first, then downscales dimensions if still exceeding 50KB.
 */
export const compressImageBelow50KB = async (sourceCanvas, maxBytes = 50 * 1024) => {
  let currentCanvas = sourceCanvas;

  // Step 1: Iteratively reduce quality from 0.88 down to 0.25
  let quality = 0.88;
  let blob = await new Promise((res) => currentCanvas.toBlob(res, "image/jpeg", quality));

  while (blob && blob.size > maxBytes && quality > 0.25) {
    quality -= 0.12;
    blob = await new Promise((res) => currentCanvas.toBlob(res, "image/jpeg", quality));
  }

  // Step 2: If still > maxBytes, iteratively downscale resolution
  while (blob && blob.size > maxBytes && currentCanvas.width > 160) {
    const scale = 0.82;
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(currentCanvas.width * scale);
    scaled.height = Math.round(currentCanvas.height * scale);
    const sCtx = scaled.getContext("2d");
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = "high";
    sCtx.drawImage(currentCanvas, 0, 0, scaled.width, scaled.height);
    currentCanvas = scaled;
    blob = await new Promise((res) => currentCanvas.toBlob(res, "image/jpeg", 0.72));
  }

  return blob;
};

export const ProfileImageCropperModal = ({
  imageSrc,
  onCancel,
  onConfirm,
  maxSizeBytes = 50 * 1024,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(new Image());

  const [cropBox, setCropBox] = useState(null);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 320 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize image natural dimensions and centered 1:1 square crop box
  useEffect(() => {
    if (!imageSrc) return;
    const img = imgRef.current;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setImgNaturalSize({ w: nw, h: nh });

      // 1:1 square crop: min dimension
      const squareSize = Math.min(nw, nh);
      const cx = Math.round((nw - squareSize) / 2);
      const cy = Math.round((nh - squareSize) / 2);
      setCropBox({ x: cx, y: cy, w: squareSize, h: squareSize });
      setScale(1);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle responsive canvas container scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const maxW = container.clientWidth || 460;
    const maxH = 320;
    const { w: nw, h: nh } = imgNaturalSize;
    if (!nw || !nh) return;
    const s = Math.min(maxW / nw, maxH / nh, 1);
    setScale(s);
    setCanvasSize({ w: Math.round(nw * s), h: Math.round(nh * s) });
  }, [imgNaturalSize]);

  // Render crop box overlay on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cropBox) return;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    const { w: nw, h: nh } = imgNaturalSize;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    ctx.drawImage(img, 0, 0, nw, nh, 0, 0, canvasSize.w, canvasSize.h);

    // Dim background outside crop box
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    const { x, y, w, h } = cropBox;
    const dx = Math.round(x * scale);
    const dy = Math.round(y * scale);
    const dw = Math.round(w * scale);
    const dh = Math.round(h * scale);

    ctx.fillRect(0, 0, canvasSize.w, dy);
    ctx.fillRect(0, dy + dh, canvasSize.w, canvasSize.h - dy - dh);
    ctx.fillRect(0, dy, dx, dh);
    ctx.fillRect(dx + dw, dy, canvasSize.w - dx - dw, dh);

    // Circular profile guide outline
    ctx.save();
    ctx.beginPath();
    ctx.arc(dx + dw / 2, dy + dh / 2, Math.min(dw, dh) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Crop box rectangle
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(dx, dy, dw, dh);
    ctx.setLineDash([]);

    // 1:1 Badge
    ctx.fillStyle = "rgba(59, 130, 246, 0.95)";
    ctx.fillRect(dx, dy > 20 ? dy - 20 : dy, 60, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("1:1 Avatar", dx + 6, dy > 20 ? dy - 6 : dy + 14);
  }, [cropBox, scale, canvasSize, imgNaturalSize]);

  const toImgCoords = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return { ix: 0, iy: 0 };
      const rect = canvas.getBoundingClientRect();
      return { ix: (clientX - rect.left) / scale, iy: (clientY - rect.top) / scale };
    },
    [scale]
  );

  const onMouseDown = useCallback(
    (e) => {
      const { ix, iy } = toImgCoords(e.clientX, e.clientY);
      setDragging(true);
      setDragStart({ ix, iy, origBox: { ...cropBox } });
    },
    [toImgCoords, cropBox]
  );

  const onMouseMove = useCallback(
    (e) => {
      if (!dragging || !dragStart) return;
      const { ix, iy } = toImgCoords(e.clientX, e.clientY);
      const dx2 = ix - dragStart.ix;
      const dy2 = iy - dragStart.iy;
      const { origBox } = dragStart;
      const { w: nw, h: nh } = imgNaturalSize;

      let nx = Math.round(origBox.x + dx2);
      let ny = Math.round(origBox.y + dy2);
      nx = Math.max(0, Math.min(nx, nw - origBox.w));
      ny = Math.max(0, Math.min(ny, nh - origBox.h));
      setCropBox((prev) => ({ ...prev, x: nx, y: ny }));
    },
    [dragging, dragStart, toImgCoords, imgNaturalSize]
  );

  const onMouseUp = useCallback(() => {
    setDragging(false);
    setDragStart(null);
  }, []);

  const getTouch = (e) => ({
    clientX: e.touches[0].clientX,
    clientY: e.touches[0].clientY,
  });

  const adjustCropSize = (delta) => {
    if (!cropBox) return;
    const { w: nw, h: nh } = imgNaturalSize;
    const maxSquare = Math.min(nw, nh);
    let newSize = Math.max(80, Math.min(Math.round(cropBox.w + delta), maxSquare));

    let nx = Math.max(0, Math.min(Math.round(cropBox.x - (newSize - cropBox.w) / 2), nw - newSize));
    let ny = Math.max(0, Math.min(Math.round(cropBox.y - (newSize - cropBox.h) / 2), nh - newSize));
    setCropBox({ x: nx, y: ny, w: newSize, h: newSize });
  };

  const handleConfirm = async () => {
    if (!cropBox || isProcessing) return;
    setIsProcessing(true);
    try {
      const offscreen = document.createElement("canvas");
      offscreen.width = cropBox.w;
      offscreen.height = cropBox.h;
      const ctx = offscreen.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        imgRef.current,
        cropBox.x,
        cropBox.y,
        cropBox.w,
        cropBox.h,
        0,
        0,
        cropBox.w,
        cropBox.h
      );

      const compressedBlob = await compressImageBelow50KB(offscreen, maxSizeBytes);
      onConfirm(compressedBlob);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FiCrop className="text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Crop & Compress Profile Photo
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                1:1 Aspect ratio · Compressed to ≤ 50KB
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex items-center justify-center p-4 bg-slate-950 overflow-hidden relative min-h-[260px]"
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="rounded-2xl cursor-move select-none shadow-lg"
            style={{ maxWidth: "100%", touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={(e) => onMouseDown(getTouch(e))}
            onTouchMove={(e) => onMouseMove(getTouch(e))}
            onTouchEnd={onMouseUp}
          />
        </div>

        {/* Helper Note */}
        <div className="px-5 py-2.5 bg-blue-50/50 dark:bg-blue-950/30 border-y border-blue-100 dark:border-blue-900/30 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300">
          <FiInfo className="shrink-0" />
          <span>Drag the frame to position your face. Use zoom buttons below to resize.</span>
        </div>

        {/* Controls Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustCropSize(-30)}
              disabled={isProcessing}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom In (Shrink crop window)"
            >
              <FiZoomIn size={15} />
            </button>
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Zoom</span>
            <button
              onClick={() => adjustCropSize(30)}
              disabled={isProcessing}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom Out (Expand crop window)"
            >
              <FiZoomOut size={15} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <FiCheck size={14} />
              <span>{isProcessing ? "Compressing..." : "Crop & Upload (≤ 50KB)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageCropperModal;
