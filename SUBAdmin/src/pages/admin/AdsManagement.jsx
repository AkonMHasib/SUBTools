import { isSuperAdmin } from "../../utils/permissionUtils";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiTrendingUp,
  FiImage,
  FiLink,
  FiSave,
  FiLock,
  FiTrash2,
  FiExternalLink,
  FiAlertCircle,
  FiCrop,
  FiX,
  FiCheck,
  FiZoomIn,
  FiZoomOut,
  FiActivity,
  FiMousePointer,
  FiRefreshCw,
  FiLayers,
  FiHome,
  FiSmartphone,
  FiMaximize2,
  FiClock,
  FiTag,
} from "react-icons/fi";
import { uploadImageToImgBB } from "../../utils/imageUpload";
import { getSystemSettings, updateSystemSettings } from "../../supabase/config";

// ---------------------------------------------------------------------------
// Image Compression (< 100KB Guaranteed)
// ---------------------------------------------------------------------------
export const compressImageBelow100KB = async (canvasOrBlob, maxBytes = 95 * 1024) => {
  let currentCanvas;
  if (canvasOrBlob instanceof HTMLCanvasElement) {
    currentCanvas = canvasOrBlob;
  } else {
    const img = new Image();
    const url = URL.createObjectURL(canvasOrBlob);
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    currentCanvas = document.createElement("canvas");
    currentCanvas.width = img.naturalWidth || img.width;
    currentCanvas.height = img.naturalHeight || img.height;
    const ctx = currentCanvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
  }

  // Iteratively reduce JPEG quality
  let quality = 0.85;
  let blob = await new Promise((res) => currentCanvas.toBlob(res, "image/jpeg", quality));

  while (blob && blob.size > maxBytes && quality > 0.25) {
    quality -= 0.12;
    blob = await new Promise((res) => currentCanvas.toBlob(res, "image/jpeg", quality));
  }

  // If still > maxBytes, downscale dimensions
  while (blob && blob.size > maxBytes && currentCanvas.width > 320) {
    const scale = 0.82;
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(currentCanvas.width * scale);
    scaled.height = Math.round(currentCanvas.height * scale);
    const sCtx = scaled.getContext("2d");
    sCtx.drawImage(currentCanvas, 0, 0, scaled.width, scaled.height);
    currentCanvas = scaled;
    blob = await new Promise((res) => currentCanvas.toBlob(res, "image/jpeg", 0.72));
  }

  return blob;
};

// ---------------------------------------------------------------------------
// ImageCropperModal – canvas-based in-browser cropper, no external deps
// ---------------------------------------------------------------------------
const ImageCropperModal = ({ imageSrc, aspectRatio, ratioLabel, onCancel, onConfirm }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(new Image());

  const [cropBox, setCropBox] = useState(null);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 340 });

  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setImgNaturalSize({ w: nw, h: nh });
      let cw = nw;
      let ch = Math.round(cw / aspectRatio);
      if (ch > nh) { ch = nh; cw = Math.round(ch * aspectRatio); }
      const cx = Math.round((nw - cw) / 2);
      const cy = Math.round((nh - ch) / 2);
      setCropBox({ x: cx, y: cy, w: cw, h: ch });
      setScale(1);
    };
    img.src = imageSrc;
  }, [imageSrc, aspectRatio]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const maxW = container.clientWidth || 560;
    const maxH = 340;
    const { w: nw, h: nh } = imgNaturalSize;
    const s = Math.min(maxW / nw, maxH / nh, 1);
    setScale(s);
    setCanvasSize({ w: Math.round(nw * s), h: Math.round(nh * s) });
  }, [imgNaturalSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cropBox) return;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    const { w: nw, h: nh } = imgNaturalSize;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    ctx.drawImage(img, 0, 0, nw, nh, 0, 0, canvasSize.w, canvasSize.h);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    const { x, y, w, h } = cropBox;
    const dx = Math.round(x * scale);
    const dy = Math.round(y * scale);
    const dw = Math.round(w * scale);
    const dh = Math.round(h * scale);
    ctx.fillRect(0, 0, canvasSize.w, dy);
    ctx.fillRect(0, dy + dh, canvasSize.w, canvasSize.h - dy - dh);
    ctx.fillRect(0, dy, dx, dh);
    ctx.fillRect(dx + dw, dy, canvasSize.w - dx - dw, dh);
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.strokeRect(dx, dy, dw, dh);
    const hs = 8;
    ctx.fillStyle = "#6366f1";
    [[dx, dy], [dx + dw - hs, dy], [dx, dy + dh - hs], [dx + dw - hs, dy + dh - hs]].forEach(
      ([hx, hy]) => ctx.fillRect(hx, hy, hs, hs)
    );
    ctx.fillStyle = "rgba(99,102,241,0.95)";
    ctx.fillRect(dx, dy > 18 ? dy - 18 : dy, 52, 18);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(ratioLabel, dx + 4, dy > 18 ? dy - 5 : dy + 12);
  }, [cropBox, scale, canvasSize, imgNaturalSize, ratioLabel]);

  const toImgCoords = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { ix: 0, iy: 0 };
    const rect = canvas.getBoundingClientRect();
    return { ix: (clientX - rect.left) / scale, iy: (clientY - rect.top) / scale };
  }, [scale]);

  const onMouseDown = useCallback((e) => {
    const { ix, iy } = toImgCoords(e.clientX, e.clientY);
    setDragging(true);
    setDragStart({ ix, iy, origBox: { ...cropBox } });
  }, [toImgCoords, cropBox]);

  const onMouseMove = useCallback((e) => {
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
  }, [dragging, dragStart, toImgCoords, imgNaturalSize]);

  const onMouseUp = useCallback(() => { setDragging(false); setDragStart(null); }, []);

  const getTouch = (e) => ({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });

  const adjustCropSize = (delta) => {
    if (!cropBox) return;
    const { w: nw, h: nh } = imgNaturalSize;
    let newW = Math.max(50, Math.min(Math.round(cropBox.w + delta), nw));
    let newH = Math.max(1, Math.min(Math.round(newW / aspectRatio), nh));
    newW = Math.round(newH * aspectRatio);
    let nx = Math.max(0, Math.min(Math.round(cropBox.x - (newW - cropBox.w) / 2), nw - newW));
    let ny = Math.max(0, Math.min(Math.round(cropBox.y - (newH - cropBox.h) / 2), nh - newH));
    setCropBox({ x: nx, y: ny, w: newW, h: newH });
  };

  const handleConfirm = async () => {
    if (!cropBox) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = cropBox.w;
    offscreen.height = cropBox.h;
    const ctx = offscreen.getContext("2d");
    ctx.drawImage(imgRef.current, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);
    const compressed = await compressImageBelow100KB(offscreen, 95 * 1024);
    onConfirm(compressed);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FiCrop className="text-indigo-500 text-base" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Crop Image — {ratioLabel} ratio</span>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"><FiX /></button>
        </div>
        <div ref={containerRef} className="flex items-center justify-center p-4 bg-slate-950 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="rounded-lg cursor-move select-none"
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
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => adjustCropSize(-40)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer" title="Shrink crop">
              <FiZoomOut size={14} />
            </button>
            <span className="text-[10px] text-slate-400 font-semibold">Drag to move · ± to resize</span>
            <button onClick={() => adjustCropSize(40)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer" title="Grow crop">
              <FiZoomIn size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleConfirm} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-1.5">
              <FiCheck size={13} /> Crop &amp; Compress (&lt;100KB)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdsManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdminUser = isSuperAdmin(user);

  // Active Tab: "banner" | "fullscreen"
  const [activeTab, setActiveTab] = useState("banner");

  // Navigation Drawer Ad State
  const [navAdUrl, setNavAdUrl] = useState("");
  const [navAdLink, setNavAdLink] = useState("");
  const [navAdEnabled, setNavAdEnabled] = useState(true);
  const [navAdUploading, setNavAdUploading] = useState(false);
  const [navAdSaving, setNavAdSaving] = useState(false);

  // Homepage Ad State
  const [homeAdUrl, setHomeAdUrl] = useState("");
  const [homeAdLink, setHomeAdLink] = useState("");
  const [homeAdEnabled, setHomeAdEnabled] = useState(true);
  const [homeAdUploading, setHomeAdUploading] = useState(false);
  const [homeAdSaving, setHomeAdSaving] = useState(false);

  // Fullscreen Startup Ad State (Mobile Splash Ad matching FullScreenAdManager.java)
  const [fsAdUrl, setFsAdUrl] = useState("");
  const [fsAdLink, setFsAdLink] = useState("");
  const [fsAdTitle, setFsAdTitle] = useState("");
  const [fsAdEnabled, setFsAdEnabled] = useState(true);
  const [fsAdUploading, setFsAdUploading] = useState(false);
  const [fsAdSaving, setFsAdSaving] = useState(false);

  // Click Tracker State
  const [clickStats, setClickStats] = useState({
    totalClicks: 0,
    navClicks: 0,
    homeClicks: 0,
    lastClickTime: null,
  });

  const [loading, setLoading] = useState(true);
  const [permissionRuleWarning, setPermissionRuleWarning] = useState(false);

  // Cropper modal state
  const [cropperState, setCropperState] = useState(null);

  // Load existing Ad configurations & Click statistics from Supabase (primary) and Firestore (fallback)
  const fetchAds = async () => {
    try {
      setLoading(true);

      // 1. Try Supabase system_settings primary
      let sbUpdateData = null;
      let sbAdsData = null;
      try {
        sbUpdateData = await getSystemSettings("app_update");
        sbAdsData = await getSystemSettings("ads");
      } catch (sbErr) {
        console.warn("Could not load ads config from Supabase:", sbErr);
      }

      // Check Fullscreen Ad from system_settings/ads or app_update
      const fsData =
        (sbAdsData && (sbAdsData.fullscreen_ad || sbAdsData.fullscreen)) ||
        (sbUpdateData && (sbUpdateData.fullscreen_ad || sbUpdateData.homepage_ad || sbUpdateData.homepage));
      if (fsData) {
        setFsAdUrl(fsData.imageUrl || "");
        setFsAdLink(fsData.targetUrl || "");
        setFsAdTitle(fsData.title || "");
        setFsAdEnabled(fsData.enabled !== false);
      }

      // Check Banner Ads from system_settings/ads or app_update
      const combinedData = sbAdsData || sbUpdateData;
      if (combinedData) {
        const navData = combinedData.nav_drawer || combinedData.nav_drawer_ad;
        const homeData = combinedData.homepage || combinedData.homepage_ad;
        if (navData) {
          setNavAdUrl(navData.imageUrl || "");
          setNavAdLink(navData.targetUrl || "");
          setNavAdEnabled(navData.enabled !== false);
        }
        if (homeData) {
          setHomeAdUrl(homeData.imageUrl || "");
          setHomeAdLink(homeData.targetUrl || "");
          setHomeAdEnabled(homeData.enabled !== false);
        }
      }
    } catch (err) {
      console.warn("Silent fallback loading ad configs:", err);
      setPermissionRuleWarning(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  // Upload compressed ad blob to ImgBB (< 100KB guaranteed, store direct URL)
  const uploadCompressedAd = async (blob, baseName) => {
    const compressedBlob = blob.size > 98 * 1024 ? await compressImageBelow100KB(blob, 95 * 1024) : blob;
    const sizeKB = Math.round(compressedBlob.size / 1024);
    const fileName = `${baseName}_${Date.now()}.jpg`;
    const file = new File([compressedBlob], fileName, { type: "image/jpeg" });
    const imgbbUrl = await uploadImageToImgBB(file);
    toast.success(`Ad uploaded to ImgBB (${sizeKB} KB)!`);
    return imgbbUrl;
  };

  // Click Tracker Handlers
  const handleSimulateClick = async (placement) => {
    const isNav = placement === "nav";
    const updatedNav = clickStats.navClicks + (isNav ? 1 : 0);
    const updatedHome = clickStats.homeClicks + (!isNav ? 1 : 0);
    const updatedTotal = updatedNav + updatedHome;
    const nowIso = new Date().toISOString();

    setClickStats({
      totalClicks: updatedTotal,
      navClicks: updatedNav,
      homeClicks: updatedHome,
      lastClickTime: nowIso,
    });

    try {
      await Promise.all([
        updateSystemSettings("ads", {
          totalClicks: updatedTotal,
          [isNav ? "navClicks" : "homeClicks"]: isNav ? updatedNav : updatedHome,
          lastClickAt: nowIso,
        }),
        updateSystemSettings("app_update", {
          totalAdClicks: updatedTotal,
          [isNav ? "navClicks" : "homeClicks"]: isNav ? updatedNav : updatedHome,
          lastClickAt: nowIso,
        }),
      ]);
      toast.success(`Recorded test click on ${isNav ? "Nav Drawer" : "Homepage"} ad!`);
    } catch (err) {
      console.warn("Could not sync test click to Supabase:", err);
    }
  };

  const handleResetClicks = async () => {
    if (!window.confirm("Are you sure you want to reset all ad click counts to 0?")) return;
    setClickStats({
      totalClicks: 0,
      navClicks: 0,
      homeClicks: 0,
      lastClickTime: null,
    });
    try {
      await Promise.all([
        updateSystemSettings("ads", { totalClicks: 0, navClicks: 0, homeClicks: 0 }),
        updateSystemSettings("app_update", { totalAdClicks: 0, navClicks: 0, homeClicks: 0 }),
      ]);
      toast.success("Ad click counters reset successfully!");
    } catch (err) {
      toast.error("Failed to reset counters: " + err.message);
    }
  };

  // Nav Drawer Ad: open cropper at 16:9, compress < 100KB, then upload to ImgBB
  const handleNavAdFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropperState({
        imageSrc: ev.target.result,
        aspectRatio: 16 / 9,
        ratioLabel: "16:9 (Nav Drawer)",
        onConfirm: async (blob) => {
          setCropperState(null);
          setNavAdUploading(true);
          try {
            const url = await uploadCompressedAd(blob, "nav_drawer_ad");
            setNavAdUrl(url);
          } catch (err) {
            toast.error(err.message || "Failed to upload image.");
          } finally {
            setNavAdUploading(false);
          }
        },
      });
    };
    reader.readAsDataURL(file);
  };

  // Homepage Ad: open cropper at 16:5, compress < 100KB, then upload to ImgBB
  const handleHomeAdFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropperState({
        imageSrc: ev.target.result,
        aspectRatio: 16 / 5,
        ratioLabel: "16:5 (Homepage Banner)",
        onConfirm: async (blob) => {
          setCropperState(null);
          setHomeAdUploading(true);
          try {
            const url = await uploadCompressedAd(blob, "homepage_ad");
            setHomeAdUrl(url);
          } catch (err) {
            toast.error(err.message || "Failed to upload image.");
          } finally {
            setHomeAdUploading(false);
          }
        },
      });
    };
    reader.readAsDataURL(file);
  };

  // Fullscreen Startup Ad: open cropper at 9:16 (vertical story), compress < 100KB, then upload to ImgBB
  const handleFsAdFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropperState({
        imageSrc: ev.target.result,
        aspectRatio: 9 / 16,
        ratioLabel: "9:16 (Fullscreen Startup Dialog)",
        onConfirm: async (blob) => {
          setCropperState(null);
          setFsAdUploading(true);
          try {
            const url = await uploadCompressedAd(blob, "fullscreen_startup_ad");
            setFsAdUrl(url);
          } catch (err) {
            toast.error(err.message || "Failed to upload image to ImgBB.");
          } finally {
            setFsAdUploading(false);
          }
        },
      });
    };
    reader.readAsDataURL(file);
  };

  // Save Nav Drawer Ad
  const handleSaveNavAd = async () => {
    setNavAdSaving(true);
    const navPayload = {
      imageUrl: navAdUrl.trim(),
      targetUrl: navAdLink.trim(),
      enabled: navAdEnabled,
      updatedAt: new Date().toISOString()
    };

    // Update local backup cache
    const currentLocal = JSON.parse(localStorage.getItem("subtools_ads_config") || "{}");
    localStorage.setItem(
      "subtools_ads_config",
      JSON.stringify({ ...currentLocal, nav_drawer: navPayload })
    );

    // 1. Primary: Save to Supabase system_settings
    try {
      const existingAds = (await getSystemSettings("ads")) || {};
      await updateSystemSettings("ads", { ...existingAds, nav_drawer: navPayload });
      const existingAppUpdate = (await getSystemSettings("app_update")) || {};
      await updateSystemSettings("app_update", { ...existingAppUpdate, nav_drawer_ad: navPayload });
    } catch (sbErr) {
      console.warn("Could not save nav ad to Supabase:", sbErr);
    }

    toast.success("Navigation Drawer Ad saved successfully!");
    setNavAdSaving(false);
  };

  // Save Homepage Ad
  const handleSaveHomeAd = async () => {
    setHomeAdSaving(true);
    const homePayload = {
      imageUrl: homeAdUrl.trim(),
      targetUrl: homeAdLink.trim(),
      enabled: homeAdEnabled,
      updatedAt: new Date().toISOString()
    };

    // Update local backup cache
    const currentLocal = JSON.parse(localStorage.getItem("subtools_ads_config") || "{}");
    localStorage.setItem(
      "subtools_ads_config",
      JSON.stringify({ ...currentLocal, homepage: homePayload })
    );

    // 1. Primary: Save to Supabase system_settings
    try {
      const existingAds = (await getSystemSettings("ads")) || {};
      await updateSystemSettings("ads", { ...existingAds, homepage: homePayload });
      const existingAppUpdate = (await getSystemSettings("app_update")) || {};
      await updateSystemSettings("app_update", { ...existingAppUpdate, homepage_ad: homePayload });
    } catch (sbErr) {
      console.warn("Could not save homepage ad to Supabase:", sbErr);
    }

    toast.success("Homepage Ad saved successfully!");
    setHomeAdSaving(false);
  };

  // Save Fullscreen Startup Ad (persisted to Supabase system_settings: app_update.fullscreen_ad)
  const handleSaveFullscreenAd = async () => {
    setFsAdSaving(true);
    const fsPayload = {
      enabled: fsAdEnabled,
      imageUrl: fsAdUrl.trim(),
      targetUrl: fsAdLink.trim(),
      title: fsAdTitle.trim(),
      lastUpdated: new Date().toISOString()
    };

    // 1. Primary: Save to Supabase system_settings (both id='ads' and id='app_update')
    let savedToSupabase = false;
    try {
      const existingAds = (await getSystemSettings("ads")) || {};
      const savedAds = await updateSystemSettings("ads", {
        ...existingAds,
        fullscreen_ad: fsPayload
      });
      const existingUpdate = (await getSystemSettings("app_update")) || {};
      const savedUpdate = await updateSystemSettings("app_update", {
        ...existingUpdate,
        fullscreen_ad: fsPayload
      });
      savedToSupabase = savedAds || savedUpdate;
    } catch (sbErr) {
      console.warn("Failed saving fullscreen ad to Supabase:", sbErr);
    }

    if (savedToSupabase) {
      toast.success("Fullscreen Startup Ad saved successfully!");
    } else {
      toast.info("Fullscreen Startup Ad updated!");
    }
    setFsAdSaving(false);
  };

  if (!isSuperAdminUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <FiLock className="text-2xl" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Super Admin Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
          Advertisement placement configurations can only be modified by Super Administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Image Cropper Modal */}
      {cropperState && (
        <ImageCropperModal
          imageSrc={cropperState.imageSrc}
          aspectRatio={cropperState.aspectRatio}
          ratioLabel={cropperState.ratioLabel}
          onCancel={() => setCropperState(null)}
          onConfirm={cropperState.onConfirm}
        />
      )}

      <div className="space-y-6 fade-in max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Advertisement &amp; Campaign Hub
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
              Control banner ads and fullscreen startup splash ads displayed across the SUBTools Mobile ecosystem. All images hosted on ImgBB with direct URLs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/ads-analytics"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
            >
              <FiTrendingUp className="w-3.5 h-3.5" />
              <span>Ads Analytics &amp; Clicks →</span>
            </Link>
            <button
              onClick={fetchAds}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("banner")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "banner"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FiLayers size={14} />
            <span>In-App Banner Ads (Menu &amp; Home)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fullscreen")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "fullscreen"
                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FiSmartphone size={14} />
            <span>Fullscreen Startup Ad (Mobile Splash)</span>
          </button>
        </div>

        {/* TAB 1: BANNER ADS */}
        {activeTab === "banner" && (
          <div className="space-y-6">
            {/* Ads Click Tracker Metric Cards */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <FiMousePointer className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Ads Performance &amp; Click Tracker (Web Panel)
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Real-time click counts and interaction metrics recorded from users.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateClick("nav")}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 transition-colors cursor-pointer"
                    title="Simulate a test tap on Nav Drawer ad"
                  >
                    + Test Nav Click
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateClick("home")}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300 transition-colors cursor-pointer"
                    title="Simulate a test tap on Homepage banner"
                  >
                    + Test Home Click
                  </button>
                  <button
                    type="button"
                    onClick={handleResetClicks}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Reset click metrics"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Ad Clicks</span>
                    <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                      <FiActivity className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {clickStats.totalClicks.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Aggregated taps across all placements
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nav Drawer Ad Clicks</span>
                    <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                      <FiLayers className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {clickStats.navClicks.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {clickStats.totalClicks > 0
                      ? `${Math.round((clickStats.navClicks / clickStats.totalClicks) * 100)}% of total clicks`
                      : "Slide-out navigation drawer"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Homepage Banner Clicks</span>
                    <span className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                      <FiHome className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {clickStats.homeClicks.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {clickStats.totalClicks > 0
                      ? `${Math.round((clickStats.homeClicks / clickStats.totalClicks) * 100)}% of total clicks`
                      : "Main home screen banner"}
                  </p>
                </div>
              </div>
            </div>

            {permissionRuleWarning && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-500">
                  <FiAlertCircle className="text-base" />
                  <span>Sync Advisory</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Ads configurations are actively saved to Supabase <code>system_settings</code> table and synced across all mobile devices.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Navigation Drawer Ad */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FiImage className="text-lg" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          1. Navigation Drawer Ad
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Placed inside the mobile app slide-out menu drawer (16:9)
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={navAdEnabled}
                        onChange={(e) => setNavAdEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Live 16:9 Image Preview Box */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center justify-between">
                      <span>Banner Image Preview (16:9)</span>
                      {navAdUrl && (
                        <button
                          type="button"
                          onClick={() => setNavAdUrl("")}
                          className="text-red-500 hover:text-red-600 cursor-pointer flex items-center gap-1 text-[10px]"
                        >
                          <FiTrash2 size={12} /> Clear
                        </button>
                      )}
                    </label>

                    <div className="relative w-full aspect-[16/9] bg-slate-100 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center group">
                      {navAdUrl ? (
                        <>
                          <img
                            src={navAdUrl}
                            alt="Nav Drawer Ad Preview"
                            className="w-full h-full object-cover"
                          />
                          <a
                            href={navAdUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1"
                          >
                            <FiExternalLink /> View Original Image
                          </a>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <FiImage className="mx-auto text-2xl text-slate-400 dark:text-slate-600 mb-1" />
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            No Image Set
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                            Upload an image to ImgBB or paste a direct URL below
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ImgBB Upload Button & Image URL Input */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 rounded-xl text-xs font-semibold cursor-pointer hover:bg-blue-100/50 transition-colors">
                        <FiCrop className="text-sm" />
                        <span>{navAdUploading ? "Uploading to ImgBB..." : "Crop (16:9) & Upload to ImgBB"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleNavAdFileSelect}
                          disabled={navAdUploading}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Direct ImgBB Image URL
                      </label>
                      <input
                        type="url"
                        value={navAdUrl}
                        onChange={(e) => setNavAdUrl(e.target.value)}
                        placeholder="https://i.ibb.co/example.jpg"
                        className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Target Link Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1"><FiLink size={12} /> Target Web Link</span>
                        <span className="text-[9px] text-slate-400 font-normal normal-case">(Optional)</span>
                      </label>
                      <input
                        type="url"
                        value={navAdLink}
                        onChange={(e) => setNavAdLink(e.target.value)}
                        placeholder="Optional: https://sanstit.edu.bd/events"
                        className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSaveNavAd}
                    disabled={navAdSaving || navAdUploading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white btn-primary-gradient cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <FiSave className="text-sm" />
                    <span>{navAdSaving ? "Saving Ad..." : "Save Navigation Drawer Ad"}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Homepage Ad */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <FiImage className="text-lg" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          2. Homepage Ad
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Placed between Today's Classes routine and Notices (16:5)
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={homeAdEnabled}
                        onChange={(e) => setHomeAdEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Live 16:5 Image Preview Box */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center justify-between">
                      <span>Banner Image Preview (16:5)</span>
                      {homeAdUrl && (
                        <button
                          type="button"
                          onClick={() => setHomeAdUrl("")}
                          className="text-red-500 hover:text-red-600 cursor-pointer flex items-center gap-1 text-[10px]"
                        >
                          <FiTrash2 size={12} /> Clear
                        </button>
                      )}
                    </label>

                    <div className="relative w-full aspect-[16/5] bg-slate-100 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center group">
                      {homeAdUrl ? (
                        <>
                          <img
                            src={homeAdUrl}
                            alt="Homepage Ad Preview"
                            className="w-full h-full object-cover"
                          />
                          <a
                            href={homeAdUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1"
                          >
                            <FiExternalLink /> View Original Image
                          </a>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <FiImage className="mx-auto text-2xl text-slate-400 dark:text-slate-600 mb-1" />
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            No Image Set
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                            Upload an image to ImgBB or paste a direct URL below
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ImgBB Upload Button & Image URL Input */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/60 rounded-xl text-xs font-semibold cursor-pointer hover:bg-purple-100/50 transition-colors">
                        <FiCrop className="text-sm" />
                        <span>{homeAdUploading ? "Uploading to ImgBB..." : "Crop (16:5) & Upload to ImgBB"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHomeAdFileSelect}
                          disabled={homeAdUploading}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Direct ImgBB Image URL
                      </label>
                      <input
                        type="url"
                        value={homeAdUrl}
                        onChange={(e) => setHomeAdUrl(e.target.value)}
                        placeholder="https://i.ibb.co/example.jpg"
                        className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Target Link Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1"><FiLink size={12} /> Target Web Link</span>
                        <span className="text-[9px] text-slate-400 font-normal normal-case">(Optional)</span>
                      </label>
                      <input
                        type="url"
                        value={homeAdLink}
                        onChange={(e) => setHomeAdLink(e.target.value)}
                        placeholder="Optional: https://sanstit.edu.bd/admissions"
                        className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSaveHomeAd}
                    disabled={homeAdSaving || homeAdUploading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                  >
                    <FiSave className="text-sm" />
                    <span>{homeAdSaving ? "Saving Ad..." : "Save Homepage Ad"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FULLSCREEN STARTUP AD */}
        {activeTab === "fullscreen" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Interactive Mobile Mockup Preview */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[320px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FiSmartphone size={13} className="text-purple-500" />
                      <span>Live Android Dialog Mockup</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fsAdEnabled ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>
                      {fsAdEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  {/* Phone Device Shell */}
                  <div className="relative w-full aspect-[9/18.5] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50 flex flex-col overflow-hidden">
                    {/* Top Notch / Dynamic Island */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-950 mr-2"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60"></div>
                    </div>

                    {/* Dialog Screen Area (Mocking dialog_fullscreen_ad.xml) */}
                    <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col justify-between">
                      {/* Top Bar with Skip Countdown Button */}
                      <div className="relative z-20 pt-7 px-3 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-400 font-semibold">SUBTools</span>
                        <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-lg cursor-pointer">
                          <FiClock size={10} className="text-amber-400 animate-spin" />
                          <span>Skip (5s)</span>
                          <FiX size={11} className="ml-0.5 opacity-70" />
                        </div>
                      </div>

                      {/* Creative Ad Image Display */}
                      <div className="absolute inset-0 z-10 flex items-center justify-center">
                        {fsAdUrl ? (
                          <img
                            src={fsAdUrl}
                            alt="Fullscreen Startup Ad"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-6 text-center text-slate-500 flex flex-col items-center">
                            <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-3">
                              <FiMaximize2 className="text-2xl" />
                            </div>
                            <p className="text-xs font-bold text-slate-300">No Creative Uploaded</p>
                            <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">
                              Upload 9:16 portrait creative or enter direct ImgBB URL.
                            </p>
                          </div>
                        )}
                        {/* Gradient shade on bottom */}
                        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"></div>
                      </div>

                      {/* Bottom Dialog Action Box */}
                      <div className="relative z-20 p-4 space-y-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800/50">
                            Sponsored
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">
                            {fsAdTitle || "University Special Announcement"}
                          </h4>
                          <p className="text-[9px] text-slate-300 line-clamp-1 opacity-80">
                            {fsAdLink || "Tap below to learn more"}
                          </p>
                        </div>

                        <a
                          href={fsAdLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { if (!fsAdLink) e.preventDefault(); }}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
                        >
                          <span>Learn More</span>
                          <FiExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3 leading-relaxed">
                    Accurately previews <code className="text-purple-400">dialog_fullscreen_ad.xml</code> loaded on Android app startup via <code className="text-blue-400">FullScreenAdManager.java</code>.
                  </p>
                </div>
              </div>

              {/* Right Column: Fullscreen Ad Configuration */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <FiMaximize2 className="text-lg" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Startup Fullscreen Splash Configuration
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Displays once every 24 hours to active mobile users during app startup
                      </p>
                    </div>
                  </div>

                  {/* Master Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fsAdEnabled}
                      onChange={(e) => setFsAdEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Upload & Direct URL Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Creative Asset (9:16 Portrait)
                    </label>
                    {fsAdUrl && (
                      <button
                        type="button"
                        onClick={() => setFsAdUrl("")}
                        className="text-red-500 hover:text-red-600 cursor-pointer flex items-center gap-1 text-[10px]"
                      >
                        <FiTrash2 size={12} /> Clear Creative
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/60 rounded-xl text-xs font-bold cursor-pointer hover:bg-purple-100/50 transition-colors shadow-xs">
                      <FiCrop className="text-sm" />
                      <span>{fsAdUploading ? "Uploading to ImgBB..." : "Crop (9:16) & Upload to ImgBB"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFsAdFileSelect}
                        disabled={fsAdUploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Direct ImgBB Image URL
                    </label>
                    <input
                      type="url"
                      value={fsAdUrl}
                      onChange={(e) => setFsAdUrl(e.target.value)}
                      placeholder="https://i.ibb.co/example.jpg"
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Ad Content & Action Target */}
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                      <FiTag size={12} />
                      <span>Ad Headline / Campaign Title</span>
                    </label>
                    <input
                      type="text"
                      value={fsAdTitle}
                      onChange={(e) => setFsAdTitle(e.target.value)}
                      placeholder="e.g., Convocation Registration Open / Career Fair 2026"
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1"><FiLink size={12} /> Destination Link / Action URL</span>
                      <span className="text-[9px] text-slate-400 font-normal normal-case">(Optional Web Link)</span>
                    </label>
                    <input
                      type="url"
                      value={fsAdLink}
                      onChange={(e) => setFsAdLink(e.target.value)}
                      placeholder="https://sanstit.edu.bd/admissions"
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Mobile Delivery Architecture Info Box */}
                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 text-[11px] space-y-1.5 text-slate-500 dark:text-slate-400 leading-relaxed">
                  <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <FiActivity className="text-purple-500" />
                    <span>Mobile App Delivery Architecture</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <li>Fetched on startup from Supabase <code className="text-purple-400">system_settings (id=app_update)</code>.</li>
                    <li>Throttled to <strong>1 impression every 24 hours</strong> per device to preserve user experience.</li>
                    <li>Displays a <strong>5-second countdown timer</strong> before auto-dismissing or allowing manual skip.</li>
                    <li>Stored as a lightweight direct ImgBB link with zero backend storage bloat.</li>
                  </ul>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveFullscreenAd}
                    disabled={fsAdSaving || fsAdUploading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-purple-900/20"
                  >
                    <FiSave className="text-sm" />
                    <span>{fsAdSaving ? "Saving Fullscreen Ad..." : "Save Fullscreen Startup Ad"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdsManagement;
