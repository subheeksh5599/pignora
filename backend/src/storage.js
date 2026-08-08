import os from "node:os";
import path from "node:path";

/**
 * Writable storage root. Vercel serverless functions have a read-only
 * filesystem except /tmp — point all persistence there in that environment.
 */
export const storageRoot =
  process.env.VERCEL === "1"
    ? path.join(os.tmpdir(), "pignora-data")
    : path.join(process.cwd(), "data");
