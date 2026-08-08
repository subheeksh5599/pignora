import fs from "node:fs";
import path from "node:path";
import { storageRoot } from "./storage.js";

const DATA_FILE = path.join(storageRoot, "repos.json");

/**
 * Mock repo store (persisted to disk). In sandbox mode the contract is the
 * source of truth; this store is only used in mock mode / for the console.
 */
class RepoStore {
  constructor() {
    this.repos = new Map();
    this.load();
  }

  load() {
    if (!fs.existsSync(DATA_FILE)) return;
    try {
      const rows = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      for (const r of rows) this.repos.set(String(r.id), r);
    } catch {
      /* corrupt file: start clean */
    }
  }

  save() {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([...this.repos.values()], null, 2));
  }

  nextId() {
    return this.repos.size + 1;
  }

  add(repo) {
    this.repos.set(String(repo.id), repo);
    this.save();
  }

  get(id) {
    return this.repos.get(String(id)) ?? null;
  }

  update(id, patch) {
    const r = this.get(id);
    if (!r) return null;
    Object.assign(r, patch);
    this.save();
    return r;
  }

  list() {
    return [...this.repos.values()].sort((a, b) => b.id - a.id);
  }
}

export const repoStore = new RepoStore();
