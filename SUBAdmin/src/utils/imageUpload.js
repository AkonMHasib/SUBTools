import { getSystemSettings, updateSystemSettings } from "../supabase/config";

/**
 * Uploads an image file to ImgBB using the API Key Pool stored in Supabase system_settings.
 * Transparently fails over across active keys in order of priority or round-robin rotation.
 * Updates usage count, success/failure metrics, and last used timestamps.
 * 
 * @param {File} imageFile The file to upload.
 * @returns {Promise<string>} The uploaded image direct URL.
 */
export const uploadImageToImgBB = async (imageFile) => {
  try {
    let data = null;

    // 1. Read from Supabase system_settings
    try {
      data = await getSystemSettings("api_config");
    } catch (e) {
      console.warn("Could not read api_config from Supabase:", e);
    }

    if (!data) {
      throw new Error("ImgBB API Key Pool is not configured. Go to Settings -> API Keys to configure it.");
    }

    let keys = data.imgbb_keys || [];
    const strategy = data.imgbb_strategy || "priority";

    // Legacy fallback: single imgbb_key
    if (keys.length === 0 && data.imgbb_key) {
      keys = [
        {
          id: "key_legacy",
          name: "Primary Key",
          key: data.imgbb_key.trim(),
          status: "active",
          priority: 1,
          usageCount: 0,
          successCount: 0,
          failureCount: 0
        }
      ];
    }

    // Filter active/usable candidate keys (exclude disabled and invalid)
    let candidateKeys = keys.filter((k) => k.status !== "disabled" && k.status !== "invalid");

    if (candidateKeys.length === 0) {
      // Emergency recovery: try all non-disabled keys if all are marked invalid
      candidateKeys = keys.filter((k) => k.status !== "disabled");
    }

    if (candidateKeys.length === 0) {
      throw new Error("No active ImgBB API keys available in the pool. Please check Settings -> API Keys.");
    }

    // Sort candidate keys based on strategy
    if (strategy === "round_robin" && candidateKeys.length > 1) {
      const totalUsage = candidateKeys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
      const rotateIndex = totalUsage % candidateKeys.length;
      candidateKeys = [
        ...candidateKeys.slice(rotateIndex),
        ...candidateKeys.slice(0, rotateIndex)
      ];
    } else {
      // Priority Mode: sort by priority (1, 2, 3...)
      candidateKeys.sort((a, b) => (a.priority || 1) - (b.priority || 1));
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    let lastError = null;
    let uploadedUrl = null;

    // Loop through candidate keys for transparent failover
    for (const keyObj of candidateKeys) {
      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${keyObj.key.trim()}`, {
          method: "POST",
          body: formData
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok && result.success && result.data?.url) {
          uploadedUrl = result.data.url;

          // Update statistics for successful key
          keyObj.usageCount = (keyObj.usageCount || 0) + 1;
          keyObj.successCount = (keyObj.successCount || 0) + 1;
          keyObj.lastUsed = new Date().toISOString();
          keyObj.status = "active";
          keyObj.lastError = null;
          break;
        }

        // Upload failed for this key
        const errMessage = result.error?.message || `HTTP ${response.status} upload failed`;
        lastError = errMessage;
        keyObj.usageCount = (keyObj.usageCount || 0) + 1;
        keyObj.failureCount = (keyObj.failureCount || 0) + 1;
        keyObj.lastError = errMessage;

        if (
          errMessage.toLowerCase().includes("invalid api key") ||
          errMessage.toLowerCase().includes("revoked") ||
          response.status === 403
        ) {
          keyObj.status = "invalid";
        } else if (response.status === 429 || errMessage.toLowerCase().includes("rate limit")) {
          keyObj.status = "warning";
        }

        console.warn(`ImgBB API Key (${keyObj.name}) failed: ${errMessage}. Retrying next candidate...`);
      } catch (err) {
        lastError = err.message;
        keyObj.failureCount = (keyObj.failureCount || 0) + 1;
        keyObj.lastError = err.message;
        console.warn(`ImgBB API Key (${keyObj.name}) request error: ${err.message}. Retrying next candidate...`);
      }
    }

    // Persist updated metrics back to Supabase and Firestore
    if (keys.length > 0) {
      const topHealthy = keys.find((k) => k.status === "active") || keys[0];
      const payload = {
        ...data,
        imgbb_keys: keys,
        imgbb_key: topHealthy ? topHealthy.key : "",
        updatedAt: new Date().toISOString()
      };

      updateSystemSettings("api_config", payload).catch((e) =>
        console.warn("Failed to persist updated ImgBB key metrics to Supabase:", e)
      );
    }

    if (uploadedUrl) {
      return uploadedUrl;
    }

    throw new Error(`All ImgBB API keys in the pool failed. Last error: ${lastError || "Unknown error"}`);
  } catch (error) {
    console.error("ImgBB upload pool error:", error);
    throw error;
  }
};
