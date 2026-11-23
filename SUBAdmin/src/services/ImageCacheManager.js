// ImageCacheManager.js - Asset & Avatar Preloading & Caching
class ImageCacheManagerClass {
  constructor() {
    this.imageCache = new Set();
  }

  log(tag, url = "") {
    // Suppressed in production builds; only errors are logged
  }

  /**
   * Preloads an image into memory to prevent network reload and layout shifts.
   * @param {string} url Image URL
   * @returns {Promise<string>}
   */
  preloadImage(url) {
    if (!url || typeof url !== "string") return Promise.resolve(null);
    if (this.imageCache.has(url)) {
      this.log("IMAGE CACHE HIT", url);
      return Promise.resolve(url);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        this.imageCache.add(url);
        this.log("IMAGE PRELOADED", url);
        resolve(url);
      };
      img.onerror = () => {
        resolve(url); // Fallback gracefully
      };
    });
  }

  /**
   * Batch preloads array of image URLs (Faculty photos, notice covers, logos).
   */
  preloadImages(urlList = []) {
    if (!Array.isArray(urlList)) return Promise.resolve([]);
    const validUrls = urlList.filter((u) => u && typeof u === "string");
    return Promise.all(validUrls.map((u) => this.preloadImage(u)));
  }
}

export const ImageCacheManager = new ImageCacheManagerClass();
export default ImageCacheManager;
