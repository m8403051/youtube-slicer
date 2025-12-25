const STORAGE_KEYS = {
  enabled: "ytSlicerEnabled",
  records: "ytSlicerRecords",
};

const toggleEl = document.getElementById("toggle-record");
const statusTextEl = document.getElementById("status-text");

function log(message, data = null) {
  const stamp = new Date().toISOString();
  if (data) {
    console.log(`[YouTube Slicer][popup] ${stamp} ${message}`, data);
  } else {
    console.log(`[YouTube Slicer][popup] ${stamp} ${message}`);
  }
}

function updateStatusText(enabled) {
  statusTextEl.textContent = enabled ? "已啟動" : "已關閉";
  statusTextEl.style.color = enabled ? "#ffb454" : "#ff6b6b";
}

function loadData() {
  chrome.storage.local.get([STORAGE_KEYS.enabled], (result) => {
    const enabled = Boolean(result[STORAGE_KEYS.enabled]);
    toggleEl.checked = enabled;
    updateStatusText(enabled);
    log("Loaded state.", { enabled });
  });
}

toggleEl.addEventListener("change", () => {
  const enabled = toggleEl.checked;
  chrome.storage.local.set({ [STORAGE_KEYS.enabled]: enabled }, () => {
    updateStatusText(enabled);
    log(`Recording ${enabled ? "enabled" : "disabled"}.`);
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.enabled]) {
    const enabled = Boolean(changes[STORAGE_KEYS.enabled].newValue);
    toggleEl.checked = enabled;
    updateStatusText(enabled);
  }
});

document.addEventListener("DOMContentLoaded", loadData);
