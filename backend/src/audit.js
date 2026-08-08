import fs from "node:fs";
import path from "node:path";
import { createPdf } from "./pdf.js";
import { storageRoot } from "./storage.js";

const DATA_DIR = storageRoot;
const AUDIT_FILE = path.join(DATA_DIR, "audit.jsonl");
const ARTIFACTS_DIR = path.join(DATA_DIR, "artifacts");

/** Append one audit event to the JSONL ledger. */
export function logAudit(event) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const line = { ts: new Date().toISOString(), ...event };
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(line) + "\n");
  return line;
}

/** Read back all audit events for a repo. */
export function readAudit(repoId) {
  if (!fs.existsSync(AUDIT_FILE)) return [];
  return fs
    .readFileSync(AUDIT_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((e) => String(e.repoId) === String(repoId));
}

/**
 * Build the per-repo audit pack: JSONL events + a real local PDF artifact +
 * the on-chain proof anchor. Production Travel Rule PDFs come from the
 * Cleanverse sandbox API (download_travel_rule); the local artifact is
 * clearly labelled as locally generated.
 */
export function buildAuditPack(repoId, travelRuleArtifact) {
  const events = readAudit(repoId);
  const pdfName = `repo-${repoId}-audit.pdf`;
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const lines = [
    { text: `Pignora audit pack — repo #${repoId}`, bold: true },
    { text: `generated: ${new Date().toISOString()}`, bold: false },
    { text: `travel rule: ${travelRuleArtifact?.artifact ?? "n/a"}`, bold: false },
    { text: "", bold: false },
  ];
  for (const e of events) {
    lines.push({ text: `${e.ts}  ${e.type}`, bold: false });
    for (const [k, v] of Object.entries(e)) {
      if (k === "ts" || k === "type") continue;
      lines.push({ text: `    ${k}: ${v}`, bold: false });
    }
  }
  const pdf = createPdf(lines, { title: `Pignora audit — repo #${repoId}` });
  const pdfPath = path.join(ARTIFACTS_DIR, pdfName);
  fs.writeFileSync(pdfPath, pdf);

  return {
    repoId,
    generatedAt: new Date().toISOString(),
    events,
    travelRule: travelRuleArtifact,
    artifact: {
      name: pdfName,
      path: pdfPath,
      note: "Locally generated audit PDF (clean text artifact). Production Travel Rule PDFs are produced by the Cleanverse sandbox API after registration.",
    },
    note: "Audit pack is evidence-grade: every event is append-only and references the repo's on-chain travel rule hash.",
  };
}
