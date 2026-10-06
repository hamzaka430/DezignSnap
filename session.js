const statusEl = document.getElementById("status");
const entriesEl = document.getElementById("entries");
const downloadAgainBtn = document.getElementById("downloadAgainBtn");
const clearBtn = document.getElementById("clearBtn");

let cachedHistory = [];

init();

async function init() {
  const { sessionHistory = [] } = await chrome.storage.local.get(["sessionHistory"]);
  cachedHistory = sessionHistory;

  if (cachedHistory.length === 0) {
    statusEl.textContent = "No Q&A recorded in this session yet. Use 'DezignSnap' or 'Select Area' on a page first.";
    return;
  }

  try {
    await buildAndDownloadPdf(cachedHistory);
    statusEl.textContent = `PDF compiled and downloaded (${cachedHistory.length} entries).`;
  } catch (err) {
    console.error("PDF generation error:", err);
    statusEl.textContent = `PDF generation error: ${escapeHtml(err.message || String(err))}. You can still view your session transcript below.`;
  }
}

function renderPreview(history) {
  entriesEl.innerHTML = "";
  const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);

  history.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "entry";
    const date = new Date(e.timestamp).toLocaleString("en-US");
    let body;

    if (e.turns && e.turns.length > 0) {
      body = e.turns
        .map((t) => {
          const isUser = t.role === "user";
          const label = isUser ? "You" : "AI";
          const rawConf = String(t.confidence || "").toLowerCase().trim();
          const isSafeConf = VALID_CONFIDENCE.has(rawConf);
          const confClass = isSafeConf ? `conf-${rawConf}` : "";
          const safeConfText = isSafeConf
            ? rawConf.charAt(0).toUpperCase() + rawConf.slice(1)
            : escapeHtml(t.confidence);
          const confBadge = t.confidence
            ? `<span class="conf-badge ${confClass}">${safeConfText} Confidence</span>`
            : "";
          return `<div class="turn ${isUser ? "user-turn" : "ai-turn"}"><strong>${label}:</strong> ${escapeHtml(t.text)} ${confBadge}</div>`;
        })
        .join("");
    } else {
      body = `<div class="turn user-turn"><strong>Instruction:</strong> ${escapeHtml(e.instruction)}</div><div class="turn ai-turn"><strong>Answer:</strong> ${escapeHtml(e.answer)}</div>`;
    }

    div.innerHTML = `
      <div class="meta">#${i + 1} • ${escapeHtml(e.pageTitle || e.pageUrl || "Webpage")} • ${date}${e.provider ? " • Engine: " + escapeHtml(e.provider) : ""}</div>
      ${body}
      ${(e.screenshot || e.thumbnail) ? `<div style="margin-top: 14px;"><img src="${e.screenshot || e.thumbnail}" alt="Screenshot" style="max-width: 100%; max-height: 320px; border-radius: 12px; border: 1.5px solid rgba(74, 21, 75, 0.18); display: block;" /><span style="font-size: 11px; font-weight: 700; color: #4a154b; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Screenshot Evidence</span></div>` : ""}
    `;
    entriesEl.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

downloadAgainBtn.addEventListener("click", async () => {
  if (cachedHistory.length > 0) {
    statusEl.textContent = "Generating PDF...";
    try {
      await buildAndDownloadPdf(cachedHistory);
      statusEl.textContent = `PDF compiled and downloaded (${cachedHistory.length} entries).`;
    } catch (err) {
      console.error("PDF download failed:", err);
      statusEl.textContent = `PDF generation error: ${escapeHtml(err.message || String(err))}.`;
    }
  }
});

clearBtn.addEventListener("click", async () => {
  if (!confirm("This will permanently clear your entire session history. Continue?")) return;
  await chrome.storage.local.set({ sessionHistory: [] });
  cachedHistory = [];
  entriesEl.innerHTML = "";
  statusEl.textContent = "Session history cleared. Ready for your next research session.";
});

async function buildAndDownloadPdf(history) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Title
  doc.setFontSize(20);
  doc.setTextColor(74, 21, 75); // Aubergine (#4a154b)
  doc.text("DezignSnap — Session Intelligence Report", margin, y);
  y += 22;

  doc.setFontSize(10);
  doc.setTextColor(105, 105, 105); // Ink Mute (#696969)
  doc.text(`Generated: ${new Date().toLocaleString("en-US")}  •  Private Client-Side Export`, margin, y);
  y += 24;

  // Header accent bar
  doc.setDrawColor(217, 189, 222); // Mauve (#d9bdde) bar
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    y = ensureSpace(doc, y, margin, 50);

    // Entry Meta Tag
    doc.setFontSize(10);
    doc.setTextColor(74, 21, 75); // Aubergine (#4a154b)
    const dateStr = new Date(entry.timestamp).toLocaleString("en-US");
    const providerStr = entry.provider ? `  •  Engine: ${entry.provider}` : "";
    doc.text(`Entry #${i + 1}  •  ${dateStr}${providerStr}`, margin, y);
    y += 14;

    if (entry.pageTitle || entry.pageUrl) {
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      const pageLine = doc.splitTextToSize(`Source: ${entry.pageTitle || entry.pageUrl}`, maxWidth);
      y = writeLines(doc, pageLine, margin, y, margin);
      y += 6;
    }

    if (entry.turns && entry.turns.length > 0) {
      for (const turn of entry.turns) {
        const isUser = turn.role === "user";
        doc.setFontSize(10.5);
        if (isUser) {
          doc.setTextColor(57, 62, 70);
          const lines = doc.splitTextToSize(`Prompt: ${turn.text}`, maxWidth);
          y = writeLines(doc, lines, margin, y, margin);
          y += 4;
        } else {
          doc.setTextColor(25, 25, 25);
          const confSuffix = turn.confidence ? `  [Confidence: ${turn.confidence}]` : "";
          const lines = doc.splitTextToSize(`AI: ${turn.text}${confSuffix}`, maxWidth);
          y = writeLines(doc, lines, margin, y, margin);
          y += 8;
        }
      }
    } else {
      doc.setFontSize(10.5);
      doc.setTextColor(57, 62, 70);
      const instrLines = doc.splitTextToSize(`Prompt: ${entry.instruction}`, maxWidth);
      y = writeLines(doc, instrLines, margin, y, margin);
      y += 4;

      doc.setFontSize(10.5);
      doc.setTextColor(25, 25, 25);
      const answerLines = doc.splitTextToSize(entry.answer || "", maxWidth);
      y = writeLines(doc, answerLines, margin, y, margin);
      y += 8;
    }

    const imgSource = entry.screenshot || entry.thumbnail;
    if (imgSource) {
      try {
        const dims = await getImageDims(imgSource);
        const imgWidth = Math.min(maxWidth, 480);
        const imgHeight = (dims.height / dims.width) * imgWidth;
        y = ensureSpace(doc, y, margin, imgHeight + 10);
        const imgFormat = imgSource.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(imgSource, imgFormat, margin, y, imgWidth, imgHeight);
        y += imgHeight + 14;
      } catch (e) {
        // Continue if screenshot fails to render
      }
    }

    y += 8;
    doc.setDrawColor(230, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
  }

  const filename = `dezignsnap-session-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function writeLines(doc, lines, x, y, margin) {
  const lineHeight = 14;
  lines.forEach((line) => {
    y = ensureSpace(doc, y, margin, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function ensureSpace(doc, y, margin, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function getImageDims(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
