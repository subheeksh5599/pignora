import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Load a contract ABI from the Foundry out/ artifacts. */
export function loadABI(name) {
  const p = path.resolve(here, "../../contracts/out", `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}
