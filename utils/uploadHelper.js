import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getUploadsDir() {
  if (process.env.UPLOADS_DIR) {
    if (!fs.existsSync(process.env.UPLOADS_DIR)) {
      try { fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true }); } catch (_) {}
    }
    return process.env.UPLOADS_DIR;
  }

  // Check persistent Hostinger paths first so files persist across Git rebuilds
  const persistentCandidates = [
    "/home/u628156753/nodejs/uploads",
    "/home/u628156753/public_html/uploads"
  ];

  for (const candidate of persistentCandidates) {
    try {
      const parentDir = path.dirname(candidate);
      if (fs.existsSync(parentDir)) {
        if (!fs.existsSync(candidate)) {
          fs.mkdirSync(candidate, { recursive: true });
        }
        return candidate;
      }
    } catch (_) {}
  }

  // Default fallback to local project uploads folder
  const localUploads = path.resolve(__dirname, "../uploads");
  if (!fs.existsSync(localUploads)) {
    try { fs.mkdirSync(localUploads, { recursive: true }); } catch (_) {}
  }
  return localUploads;
}

export function findFileInAllUploadLocations(filename) {
  const cleanFilename = path.basename(filename);
  const candidatePaths = [
    path.join(getUploadsDir(), cleanFilename),
    path.resolve(__dirname, "../uploads", cleanFilename),
    path.join("/home/u628156753/nodejs/uploads", cleanFilename),
    path.join("/home/u628156753/public_html/uploads", cleanFilename)
  ];

  // Also search dynamic Hostinger hbuilds version folders so older uploaded files are never lost
  try {
    const versionsDir = "/home/u628156753/domains/palevioletred-ape-449755.hostingersite.com/hbuilds/versions";
    if (fs.existsSync(versionsDir)) {
      const versionFolders = fs.readdirSync(versionsDir);
      for (const vf of versionFolders) {
        candidatePaths.push(path.join(versionsDir, vf, "nodejs", "uploads", cleanFilename));
      }
    }
  } catch (_) {}

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (_) {}
  }

  return null;
}
