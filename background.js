const STORAGE_KEYS = {
  enabled: "ytSlicerEnabled",
  records: "ytSlicerRecords",
};

function log(message, data = null) {
  const stamp = new Date().toISOString();
  if (data) {
    console.log(`[YouTube Slicer][background] ${stamp} ${message}`, data);
  } else {
    console.log(`[YouTube Slicer][background] ${stamp} ${message}`);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(
    [STORAGE_KEYS.enabled, STORAGE_KEYS.records],
    (result) => {
      const updates = {};
      if (typeof result[STORAGE_KEYS.enabled] === "undefined") {
        updates[STORAGE_KEYS.enabled] = false;
      }
      if (!Array.isArray(result[STORAGE_KEYS.records])) {
        updates[STORAGE_KEYS.records] = [];
      }
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates, () => {
          log("Initialized storage defaults.", updates);
        });
      } else {
        log("Storage already initialized.");
      }
    }
  );
});
