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
    statusEl.textContent = "No Q&A recorded in this session yet. Use 'Solve with AI' on a page first.";
    return;
  }

  renderPreview(cachedHistory);
  await buildAndDownloadPdf(cachedHistory);
  statusEl.textContent = `✅ PDF downloaded (${cachedHistory.length} entries).`;
}

function renderPreview(history) {
  entriesEl.innerHTML = "";
  history.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "entry";
    const date = new Date(e.timestamp).toLocaleString("en-US");
    let body;
    if (e.turns && e.turns.length > 0) {
      body = e.turns
        .map((t) => {
          const label = t.role === "user" ? "Q" : "A";
          const conf = t.confidence ? ` [${t.confidence}]` : "";
          return `<div class="turn"><strong>${label}${conf}:</strong> ${escapeHtml(t.text)}</div>`;
        })
        .join("");
    } else {
      body = `<div class="instruction">Instruction: ${escapeHtml(e.instruction)}</div><div class="answer">${escapeHtml(e.answer)}</div>`;
    }
    div.innerHTML = `
      <div class="meta">#${i + 1} • ${escapeHtml(e.pageTitle || e.pageUrl || "")} • ${date}${e.provider ? " • " + escapeHtml(e.provider) : ""}</div>
      ${body}
    `;
    entriesEl.appendChild(div);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

downloadAgainBtn.addEventListener("click", () => {
  if (cachedHistory.length > 0) buildAndDownloadPdf(cachedHistory);
});

clearBtn.addEventListener("click", async () => {
  if (!confirm("This will permanently delete your entire session history. Continue?")) return;
  await chrome.storage.local.set({ sessionHistory: [] });
  cachedHistory = [];
  entriesEl.innerHTML = "";
  statusEl.textContent = "History cleared. Starting a new session.";
});

async function buildAndDownloadPdf(history) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFontSize(18);
  doc.setTextColor(148, 109, 109); // brown
  doc.text("Page Helper AI - Session Transcript", margin, y);
  y += 20;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, margin, y);
  y += 25;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    y = ensureSpace(doc, y, margin, 40);

    doc.setFontSize(10);
    doc.setTextColor(160, 144, 183); // mauve
    const dateStr = new Date(entry.timestamp).toLocaleString("en-US");
    const providerStr = entry.provider ? `  •  ${entry.provider}` : "";
    doc.text(`#${i + 1}  •  ${dateStr}${providerStr}`, margin, y);
    y += 14;

    if (entry.pageTitle || entry.pageUrl) {
      doc.setFontSize(9);
      doc.setTextColor(130);
      const pageLine = doc.splitTextToSize(entry.pageTitle || entry.pageUrl, maxWidth);
      y = writeLines(doc, pageLine, margin, y, margin);
      y += 4;
    }

    if (entry.turns && entry.turns.length > 0) {
      for (const turn of entry.turns) {
        const isUser = turn.role === "user";
        doc.setFontSize(11);
        doc.setTextColor(isUser ? 22 : 50, isUser ? 56 : 40, isUser ? 74 : 40);
        const label = isUser ? "Q: " : "A: ";
        const confSuffix = !isUser && turn.confidence ? `  [Confidence: ${turn.confidence}]` : "";
        const lines = doc.splitTextToSize(label + turn.text + confSuffix, maxWidth);
        y = writeLines(doc, lines, margin, y, margin);
        y += 4;
      }
      y += 4;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(148, 109, 109);
      const instrLines = doc.splitTextToSize(`Instruction: ${entry.instruction}`, maxWidth);
      y = writeLines(doc, instrLines, margin, y, margin);
      y += 4;

      doc.setFontSize(11);
      doc.setTextColor(50, 40, 40);
      const answerLines = doc.splitTextToSize(entry.answer || "", maxWidth);
      y = writeLines(doc, answerLines, margin, y, margin);
      y += 8;
    }

    if (entry.thumbnail) {
      try {
        const dims = await getImageDims(entry.thumbnail);
        const imgWidth = Math.min(maxWidth, 260);
        const imgHeight = (dims.height / dims.width) * imgWidth;
        y = ensureSpace(doc, y, margin, imgHeight + 10);
        doc.addImage(entry.thumbnail, "JPEG", margin, y, imgWidth, imgHeight);
        y += imgHeight + 14;
      } catch (e) {
        // If the image can't be embedded, continue with text only.
      }
    }

    y += 6;
    doc.setDrawColor(176, 205, 230); // light blue
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
  }

  const filename = `page-helper-session-${new Date().toISOString().slice(0, 10)}.pdf`;
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
