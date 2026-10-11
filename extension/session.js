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

  // Display on-screen session preview immediately
  renderPreview(cachedHistory);

  try {
    await buildAndDownloadPdf(cachedHistory);
    statusEl.textContent = `PDF compiled and downloaded (${cachedHistory.length} entries).`;
  } catch (err) {
    console.error("PDF generation error:", err);
    statusEl.textContent = `PDF generation error: ${escapeHtml(err.message || String(err))}. You can still view your session transcript below.`;
  }
}

function cleanPdfText(str) {
  if (!str) return "";
  let text = String(str);

  // 1. Strip internal <thinking>...</thinking> tags and blocks
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

  // 2. Strip 4-byte UTF-8 emojis and surrogate symbols (prevents Ø=Üø corruption in jsPDF)
  text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "");

  // 3. Normalize typography & punctuation that corrupts standard PDF WinAnsi encoding
  text = text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u2014\u2013\u2015]/g, " - ")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "- ")
    .replace(/[\u2192\u21D2]/g, "->")
    .replace(/[\u2190\u21D0]/g, "<-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
    .replace(/\t/g, "  ");

  // 4. Clean raw markdown symbols so PDF reads like an executive report
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/`([^`]+)`/g, "'$1'");
  text = text.replace(/^#{1,6}\s+/gm, "");

  // 5. Normalize spacing
  text = text.replace(/[ \t]+/g, " ");

  // 6. Map non-Latin codepoints safely
  text = text.replace(/[^\x00-\x7F\xA0-\xFF]/g, " ");

  return text.trim();
}

function wrapSafeLines(doc, text, maxWidth) {
  if (!text) return [];
  const paragraphs = text.split(/\r?\n/);
  const resultLines = [];

  for (const p of paragraphs) {
    const cleanP = p.trim();
    if (!cleanP) {
      resultLines.push("");
      continue;
    }
    // Prevent unbroken URLs or long tokens from bleeding off page margins
    const words = cleanP.split(" ");
    const safeWords = words
      .map((w) => {
        if (w.length > 38) {
          const parts = w.match(/.{1,35}/g);
          return parts ? parts.join(" ") : w;
        }
        return w;
      })
      .join(" ");

    const split = doc.splitTextToSize(safeWords, maxWidth);
    resultLines.push(...split);
  }
  return resultLines;
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
          return `<div class="turn ${isUser ? "user-turn" : "ai-turn"}"><strong>${label}:</strong> ${formatPreviewMarkdown(t.text)} ${confBadge}</div>`;
        })
        .join("");
    } else {
      body = `<div class="turn user-turn"><strong>Instruction:</strong> ${formatPreviewMarkdown(e.instruction)}</div><div class="turn ai-turn"><strong>Answer:</strong> ${formatPreviewMarkdown(e.answer)}</div>`;
    }

    div.innerHTML = `
      <div class="meta">#${i + 1} • ${escapeHtml(e.pageTitle || e.pageUrl || "Webpage")} • ${date}${e.provider ? " • Engine: " + escapeHtml(e.provider) : ""}</div>
      ${body}
      ${(e.screenshot || e.thumbnail) ? `<div style="margin-top: 14px;"><a href="${e.screenshot || e.thumbnail}" target="_blank" title="Click to view original high-resolution screenshot" style="display: inline-block; max-width: 100%; text-decoration: none;"><img src="${e.screenshot || e.thumbnail}" alt="Screenshot" style="max-width: 100%; max-height: 460px; border-radius: 10px; border: 1.5px solid rgba(74, 21, 75, 0.18); display: block; box-shadow: 0 4px 14px rgba(0,0,0,0.06); cursor: zoom-in;" /></a><div style="font-size: 11px; font-weight: 600; color: #4a154b; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> High-Resolution Screenshot (Click to enlarge)</div></div>` : ""}
    `;
    entriesEl.appendChild(div);
  });
}

function formatPreviewMarkdown(text) {
  if (!text) return "";
  let clean = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
  clean = escapeHtml(clean);
  clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  clean = clean.replace(/`([^`]+)`/g, "<code>$1</code>");
  clean = clean.replace(/\n/g, "<br />");
  return clean;
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2; // ~507pt safe width with zero margin clipping
  let y = margin + 4;

  // --- Executive Branded Header (Page 1) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(74, 21, 75); // Slack Aubergine
  doc.text("DEZIGNSNAP", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128); // Slate 500
  doc.text("AI Intelligence & Visual Verification Report", margin + 124, y);
  y += 18;

  const exportDateStr = cleanPdfText(new Date().toLocaleString("en-US"));
  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated: ${exportDateStr}  |  ${history.length} Session Entries  |  Private Local BYOK Export`, margin, y);
  y += 12;

  // Thin Aubergine Accent Rule
  doc.setDrawColor(74, 21, 75);
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    y = ensureSpace(doc, y, margin, 70);

    // Entry Meta Bar
    doc.setFillColor(249, 240, 255); // Canvas lavender
    doc.roundedRect(margin, y - 10, maxWidth, 22, 4, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(74, 21, 75);
    doc.text(`ENTRY #${i + 1}`, margin + 8, y + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    const dateStr = cleanPdfText(new Date(entry.timestamp).toLocaleString("en-US"));
    const providerStr = entry.provider ? `  |  Engine: ${cleanPdfText(entry.provider)}` : "";
    doc.text(`${dateStr}${providerStr}`, margin + 74, y + 4);
    y += 22;

    if (entry.pageTitle || entry.pageUrl) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      const srcText = cleanPdfText(`Source: ${entry.pageTitle || entry.pageUrl}`);
      const srcLines = wrapSafeLines(doc, srcText, maxWidth);
      y = writeLines(doc, srcLines, margin, y, margin, 11.5);
      y += 6;
    }

    if (entry.turns && entry.turns.length > 0) {
      for (const turn of entry.turns) {
        const isUser = turn.role === "user";
        if (isUser) {
          y = ensureSpace(doc, y, margin, 24);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(74, 21, 75);
          doc.text("PROMPT / INSTRUCTION:", margin, y);
          y += 12;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(31, 41, 55);
          const cleanTurn = cleanPdfText(turn.text);
          const promptLines = wrapSafeLines(doc, cleanTurn, maxWidth);
          y = writeLines(doc, promptLines, margin, y, margin, 13);
          y += 8;
        } else {
          y = ensureSpace(doc, y, margin, 28);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(74, 21, 75);
          doc.text("VERIFIED AI ANALYSIS:", margin, y);

          if (turn.confidence) {
            const safeConf = cleanPdfText(turn.confidence);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            if (safeConf.toLowerCase() === "high") {
              doc.setTextColor(4, 120, 87);
            } else if (safeConf.toLowerCase() === "medium") {
              doc.setTextColor(180, 83, 9);
            } else {
              doc.setTextColor(185, 28, 28);
            }
            doc.text(`[${safeConf.toUpperCase()} CONFIDENCE]`, margin + 122, y);
          }
          y += 13;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(17, 24, 39);
          const cleanAns = cleanPdfText(turn.text);
          const answerLines = wrapSafeLines(doc, cleanAns, maxWidth);
          y = writeLines(doc, answerLines, margin, y, margin, 13.5);
          y += 12;
        }
      }
    } else {
      y = ensureSpace(doc, y, margin, 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(74, 21, 75);
      doc.text("PROMPT / INSTRUCTION:", margin, y);
      y += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);
      const cleanInstr = cleanPdfText(entry.instruction);
      const instrLines = wrapSafeLines(doc, cleanInstr, maxWidth);
      y = writeLines(doc, instrLines, margin, y, margin, 13);
      y += 8;

      y = ensureSpace(doc, y, margin, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(74, 21, 75);
      doc.text("VERIFIED AI ANALYSIS:", margin, y);
      y += 13;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(17, 24, 39);
      const cleanAns = cleanPdfText(entry.answer || "");
      const ansLines = wrapSafeLines(doc, cleanAns, maxWidth);
      y = writeLines(doc, ansLines, margin, y, margin, 13.5);
      y += 12;
    }

    const imgSource = entry.screenshot || entry.thumbnail;
    if (imgSource) {
      try {
        const dims = await getImageDims(imgSource);
        const imgWidth = Math.min(maxWidth, 480);
        const imgHeight = (dims.height / dims.width) * imgWidth;
        y = ensureSpace(doc, y, margin, imgHeight + 16);

        // Frame border for screenshot
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.8);
        doc.rect(margin, y, imgWidth, imgHeight);

        const imgFormat = imgSource.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(imgSource, imgFormat, margin, y, imgWidth, imgHeight);
        y += imgHeight + 14;
      } catch (e) {
        // Skip corrupted screenshot safely
      }
    }

    y += 6;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;
  }

  // Running footer across every page
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`DezignSnap Visual Intelligence Report  |  Page ${p} of ${totalPages}`, margin, pageHeight - 20);
  }

  const filename = `dezignsnap-session-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function writeLines(doc, lines, x, y, margin, lineHeight = 13.5) {
  for (const line of lines) {
    if (line === "") {
      y += 6;
      continue;
    }
    y = ensureSpace(doc, y, margin, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function ensureSpace(doc, y, margin, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin - 20) {
    doc.addPage();
    return margin + 20;
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
