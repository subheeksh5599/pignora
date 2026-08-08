/**
 * Minimal PDF writer (pure JS, no deps) for audit-pack artifacts.
 * Produces a real, openable .pdf with text lines. The Cleanverse sandbox
 * API produces the production Travel Rule PDFs; this is the local artifact
 * generator so the audit pack always ships a real file, clearly labelled.
 */

function escapeText(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * @param {Array<{text: string, bold?: boolean}>} lines
 * @param {{title?: string}} opts
 * @returns {Buffer} PDF bytes
 */
export function createPdf(lines, opts = {}) {
  const title = opts.title ?? "Pignora audit artifact";
  const content = [];
  content.push("BT");
  content.push("/F1 11 Tf");
  content.push("50 780 Td");
  content.push(`(${escapeText(title)}) Tj`);
  content.push("0 -20 Td");
  content.push("/F2 9 Tf");
  let y = 0;
  for (const line of lines) {
    content.push(`0 ${y} Td`);
    content.push(`(${escapeText(line.text)}) Tj`);
    y -= 14;
  }
  content.push("ET");

  const stream = content.join("\n");
  const objects = [];
  const add = (obj) => {
    objects.push(obj);
    return objects.length;
  };

  const catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
  const pages = add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  const page = add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>");
  const contents = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
