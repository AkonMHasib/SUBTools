// RequestManager.js - In-Flight Request Deduplication Engine
class RequestManagerService {
  constructor() {
    this.pendingRequests = new Map();
  }

  log(tag, key, extra = "") {
    // Suppressed in production builds; only errors are logged
  }

  /**
   * Deduplicates concurrent asynchronous execution by key.
   * If a request with the given key is currently pending, returns the existing Promise.
   *
   * @param {string} key Unique request key
   * @param {Function} fetcherFn Asynchronous fetch function () => Promise<any>
   * @returns {Promise<any>}
   */
  async deduplicate(key, fetcherFn) {
    if (this.pendingRequests.has(key)) {
      this.log("REQUEST REUSED", key, "(Joining existing in-flight Promise)");
      return this.pendingRequests.get(key);
    }

    const promise = (async () => {
      try {
        const result = await fetcherFn();
        return result;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, promise);
    return promise;
  }

  cancel(key) {
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.delete(key);
      this.log("REQUEST CANCELLED", key);
    }
  }
}

export const RequestManager = new RequestManagerService();
export default RequestManager;
