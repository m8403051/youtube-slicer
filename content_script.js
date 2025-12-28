const STORAGE_KEYS = {
  enabled: "ytSlicerEnabled",
  records: "ytSlicerRecords",
};

const DEFAULT_PAGE_SIZE = 8;

let currentPage = 1;
let cachedRecords = [];
let isEnabled = false;
let cachedPageSize = DEFAULT_PAGE_SIZE;

function log(message, data = null) {
  const stamp = new Date().toISOString();
  if (data) {
    console.log(`[YouTube Slicer][content] ${stamp} ${message}`, data);
  } else {
    console.log(`[YouTube Slicer][content] ${stamp} ${message}`);
  }
}

function formatTime(totalSeconds) {
  const totalMs = Math.floor(totalSeconds * 1000);
  const ms = totalMs % 1000;
  const totalSecondsInt = Math.floor(totalMs / 1000);
  const seconds = totalSecondsInt % 60;
  const totalMinutes = Math.floor(totalSecondsInt / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad = (value, length = 2) => String(value).padStart(length, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(ms, 3)}`;
}

function getCurrentVideo() {
  return document.querySelector("video");
}

function buildTimestampUrl(seconds) {
  const url = new URL(window.location.href);
  url.searchParams.set("t", Math.floor(seconds).toString());
  return url.toString();
}

function updateUrlTimestamp(seconds) {
  const url = new URL(window.location.href);
  url.searchParams.set("t", Math.floor(seconds).toString());
  window.history.replaceState(null, "", url.toString());
}

function createOverlay() {
  if (document.getElementById("yt-slicer-overlay")) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "yt-slicer-overlay";
  overlay.classList.add("yt-slicer-hidden");
  overlay.innerHTML = `
    <div class="yt-slicer-header">
      <div>
        <div class="yt-slicer-title">操作視窗</div>
        <div class="yt-slicer-status" id="yt-slicer-status">已關閉</div>
      </div>
      <div class="yt-slicer-actions">
        <button id="yt-slicer-record">記錄</button>
        <button id="yt-slicer-clear">清除</button>
        <button id="yt-slicer-export">匯出</button>
        <button id="yt-slicer-import">匯入</button>
      </div>
    </div>
    <div class="yt-slicer-list" id="yt-slicer-list"></div>
    <div class="yt-slicer-pagination" id="yt-slicer-pagination">
      <button id="yt-slicer-prev">←</button>
      <div id="yt-slicer-page">1/1 頁</div>
      <button id="yt-slicer-next">→</button>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #yt-slicer-overlay {
      position: fixed;
      top: 5%;
      right: 1.5%;
      width: 30%;
      height: 90%;
      background: rgba(15, 15, 18, 0.95);
      color: #f5f5f7;
      z-index: 99999;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      font-family: "Space Grotesk", "Noto Sans TC", sans-serif;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    #yt-slicer-overlay.yt-slicer-hidden {
      display: none !important;
    }

    .yt-slicer-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .yt-slicer-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.4px;
    }

    .yt-slicer-status {
      font-size: 12px;
      color: #ff6b6b;
    }

    .yt-slicer-actions {
      display: flex;
      gap: 8px;
    }

    .yt-slicer-actions button {
      flex: 1;
      border: none;
      padding: 8px 10px;
      border-radius: 10px;
      font-size: 13px;
      cursor: pointer;
      background: #2a2b31;
      color: #f5f5f7;
    }

    .yt-slicer-actions button#yt-slicer-record {
      background: #ffb454;
      color: #1e1e22;
      font-weight: 600;
    }

    .yt-slicer-actions button#yt-slicer-clear {
      background: #ff6b6b;
      color: #1e1e22;
    }

    .yt-slicer-actions button#yt-slicer-export {
      background: #6ee7ff;
      color: #1e1e22;
    }

    .yt-slicer-actions button#yt-slicer-import {
      background: #c2f970;
      color: #1e1e22;
    }

    .yt-slicer-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow: hidden;
    }

    .yt-slicer-list button {
      border: none;
      border-radius: 10px;
      background: #26272d;
      color: #f5f5f7;
      padding: 10px 12px;
      text-align: left;
      font-size: 13px;
      cursor: pointer;
    }

    .yt-slicer-list .empty {
      color: #a7a7ad;
      font-size: 12px;
    }

    .yt-slicer-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .yt-slicer-pagination.yt-slicer-pagination-hidden {
      visibility: hidden;
      pointer-events: none;
    }

    .yt-slicer-pagination button {
      border: none;
      background: #1e1f24;
      color: #f5f5f7;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
    }

    .yt-slicer-pagination button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;

  document.body.appendChild(overlay);
  document.head.appendChild(style);
}

function setOverlayVisibility() {
  const overlay = document.getElementById("yt-slicer-overlay");
  if (!overlay) {
    return;
  }
  overlay.classList.toggle("yt-slicer-hidden", !isEnabled);
}

function setStatusText() {
  const statusEl = document.getElementById("yt-slicer-status");
  if (!statusEl) {
    return;
  }
  statusEl.textContent = isEnabled ? "已啟動" : "已關閉";
  statusEl.style.color = isEnabled ? "#ffb454" : "#ff6b6b";
}

function getPageSize() {
  const listEl = document.getElementById("yt-slicer-list");
  if (!listEl) {
    return DEFAULT_PAGE_SIZE;
  }

  const listHeight = listEl.getBoundingClientRect().height;
  if (!listHeight) {
    return cachedPageSize || DEFAULT_PAGE_SIZE;
  }

  const gap = parseFloat(getComputedStyle(listEl).rowGap) || 8;
  let itemHeight = 0;
  const sampleButton = listEl.querySelector("button");
  if (sampleButton) {
    itemHeight = sampleButton.getBoundingClientRect().height;
  } else {
    const tempButton = document.createElement("button");
    tempButton.textContent = "00:00:00:000";
    tempButton.style.visibility = "hidden";
    listEl.appendChild(tempButton);
    itemHeight = tempButton.getBoundingClientRect().height;
    listEl.removeChild(tempButton);
  }

  if (!itemHeight) {
    return DEFAULT_PAGE_SIZE;
  }

  const pageSize = Math.floor((listHeight + gap) / (itemHeight + gap));
  return Math.max(1, pageSize);
}

function renderList(records, offset) {
  const listEl = document.getElementById("yt-slicer-list");
  if (!listEl) {
    return;
  }
  listEl.innerHTML = "";
  if (records.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "empty";
    emptyEl.textContent = "尚無時間標記";
    listEl.appendChild(emptyEl);
    return;
  }

  records.forEach((record, index) => {
    const button = document.createElement("button");
    button.textContent = `${offset + index + 1}. ${record.displayTime}`;
    button.addEventListener("click", () => {
      jumpToTime(record.timeSeconds);
      log("Jumped to time.", record);
    });
    listEl.appendChild(button);
  });
}

function renderPagination() {
  cachedPageSize = getPageSize();
  const totalPages = Math.max(1, Math.ceil(cachedRecords.length / cachedPageSize));
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * cachedPageSize;
  const end = start + cachedPageSize;
  const currentRecords = cachedRecords.slice(start, end);
  renderList(currentRecords, start);

  const pageEl = document.getElementById("yt-slicer-page");
  const paginationEl = document.getElementById("yt-slicer-pagination");
  const prevBtn = document.getElementById("yt-slicer-prev");
  const nextBtn = document.getElementById("yt-slicer-next");
  if (pageEl) {
    pageEl.textContent = `${currentPage}/${totalPages} 頁`;
  }
  if (paginationEl) {
    paginationEl.classList.toggle(
      "yt-slicer-pagination-hidden",
      cachedRecords.length <= cachedPageSize
    );
  }
  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }
}

function jumpToTime(seconds) {
  const video = getCurrentVideo();
  if (video) {
    video.currentTime = seconds;
    updateUrlTimestamp(seconds);
  } else {
    window.location.href = buildTimestampUrl(seconds);
  }
}

function addRecord() {
  if (!isEnabled) {
    log("Recording is disabled.");
    return;
  }
  const video = getCurrentVideo();
  if (!video) {
    log("No video element found.");
    return;
  }
  const timeSeconds = video.currentTime || 0;
  const displayTime = formatTime(timeSeconds);
  const record = {
    id: Date.now(),
    url: buildTimestampUrl(timeSeconds),
    timeSeconds,
    displayTime,
  };

  chrome.storage.local.get([STORAGE_KEYS.records], (result) => {
    const records = result[STORAGE_KEYS.records] || [];
    const updated = [...records, record];
    chrome.storage.local.set({ [STORAGE_KEYS.records]: updated }, () => {
      cachedRecords = updated;
      cachedPageSize = getPageSize();
      currentPage = Math.ceil(updated.length / cachedPageSize);
      renderPagination();
      log("Record added.", record);
    });
  });
}

function clearRecords() {
  chrome.storage.local.set({ [STORAGE_KEYS.records]: [] }, () => {
    cachedRecords = [];
    currentPage = 1;
    renderPagination();
    log("All records cleared.");
  });
}

function exportRecords() {
  chrome.storage.local.get([STORAGE_KEYS.records], (result) => {
    const records = result[STORAGE_KEYS.records] || [];
    if (records.length === 0) {
      log("No records to export.");
      return;
    }
    const lines = ["SN,URL"];
    records.forEach((record, index) => {
      lines.push(`${index + 1},${record.url}`);
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "youtube_slicer.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    log("CSV exported.");
  });
}

function isYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com")
    );
  } catch (error) {
    return false;
  }
}

function parseTimeFromUrl(url) {
  try {
    const parsed = new URL(url);
    const raw = parsed.searchParams.get("t");
    if (!raw) {
      return null;
    }
    const seconds = Number.parseInt(raw, 10);
    if (Number.isNaN(seconds) || seconds < 0) {
      return null;
    }
    return seconds;
  } catch (error) {
    return null;
  }
}

function parseImportCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { error: "匯入檔案沒有內容。" };
  }

  let startIndex = 0;
  if (/^sn\s*,\s*url/i.test(lines[0]) || /^index\s*,/i.test(lines[0])) {
    startIndex = 1;
  }

  const entries = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    const [indexPart, ...urlParts] = line.split(",");
    const indexText = (indexPart || "").trim();
    const urlText = urlParts.join(",").trim();
    if (!/^\d+$/.test(indexText) || !urlText) {
      return { error: `第 ${i + 1} 行格式不符合 <index>, <youtube URL>` };
    }
    if (!isYouTubeUrl(urlText)) {
      return { error: `第 ${i + 1} 行不是合法的 YouTube URL` };
    }
    const timeSeconds = parseTimeFromUrl(urlText);
    if (timeSeconds === null) {
      return { error: `第 ${i + 1} 行 URL 缺少有效的時間參數` };
    }
    entries.push({
      order: Number.parseInt(indexText, 10),
      url: urlText,
      timeSeconds,
    });
  }

  if (entries.length === 0) {
    return { error: "匯入檔案沒有有效內容。" };
  }

  entries.sort((a, b) => a.order - b.order);
  const records = entries.map((entry, index) => ({
    id: Date.now() + index,
    url: entry.url,
    timeSeconds: entry.timeSeconds,
    displayTime: formatTime(entry.timeSeconds),
  }));

  return { records };
}

function replaceRecords(records) {
  chrome.storage.local.set({ [STORAGE_KEYS.records]: records }, () => {
    cachedRecords = records;
    currentPage = 1;
    renderPagination();
    log("Records imported.", { count: records.length });
  });
}

function importRecords() {
  if (cachedRecords.length > 0) {
    const shouldReplace = window.confirm(
      "已存在紀錄，是否覆蓋現有內容？"
    );
    if (!shouldReplace) {
      log("Import canceled by user.");
      return;
    }
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv";
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseImportCsv(String(reader.result || ""));
      if (result.error) {
        window.alert(result.error);
        log("Import failed.", { error: result.error });
        return;
      }
      replaceRecords(result.records);
    };
    reader.onerror = () => {
      window.alert("讀取檔案失敗，請再試一次。");
      log("Import failed: file read error.");
    };
    reader.readAsText(file);
  });
  input.click();
}

function attachEvents() {
  const recordBtn = document.getElementById("yt-slicer-record");
  const clearBtn = document.getElementById("yt-slicer-clear");
  const exportBtn = document.getElementById("yt-slicer-export");
  const importBtn = document.getElementById("yt-slicer-import");
  const prevBtn = document.getElementById("yt-slicer-prev");
  const nextBtn = document.getElementById("yt-slicer-next");

  if (recordBtn) {
    recordBtn.addEventListener("click", addRecord);
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", clearRecords);
  }
  if (exportBtn) {
    exportBtn.addEventListener("click", exportRecords);
  }
  if (importBtn) {
    importBtn.addEventListener("click", importRecords);
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentPage = Math.max(1, currentPage - 1);
      renderPagination();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      cachedPageSize = getPageSize();
      const totalPages = Math.max(
        1,
        Math.ceil(cachedRecords.length / cachedPageSize)
      );
      currentPage = Math.min(totalPages, currentPage + 1);
      renderPagination();
    });
  }
}

function loadState() {
  chrome.storage.local.get(
    [STORAGE_KEYS.enabled, STORAGE_KEYS.records],
    (result) => {
      isEnabled = Boolean(result[STORAGE_KEYS.enabled]);
      cachedRecords = result[STORAGE_KEYS.records] || [];
      setStatusText();
      setOverlayVisibility();
      renderPagination();
      log("Overlay state loaded.", {
        enabled: isEnabled,
        count: cachedRecords.length,
      });
    }
  );
}

function resetEnabledOnLoad() {
  chrome.storage.local.set({ [STORAGE_KEYS.enabled]: false }, () => {
    isEnabled = false;
    setStatusText();
    setOverlayVisibility();
    log("Reset enabled state on page load.");
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.enabled]) {
    isEnabled = Boolean(changes[STORAGE_KEYS.enabled].newValue);
    setStatusText();
    setOverlayVisibility();
    if (isEnabled) {
      renderPagination();
    }
  }
  if (changes[STORAGE_KEYS.records]) {
    cachedRecords = changes[STORAGE_KEYS.records].newValue || [];
    renderPagination();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "jump-to-time" && message.payload) {
    jumpToTime(message.payload.timeSeconds);
  }
});

function init() {
  createOverlay();
  attachEvents();
  resetEnabledOnLoad();
  loadState();
  window.addEventListener("resize", () => {
    if (isEnabled) {
      renderPagination();
    }
  });
}

init();
