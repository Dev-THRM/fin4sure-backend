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

  // Try persistent Hostinger paths. Use recursive mkdir so we don't need to
  // check whether the parent exists first — this handles symlink layouts too.
  const persistentCandidates = [
    "/home/u628156753/public_html/uploads", // Make this first so user can see files in File Manager
    "/home/u628156753/uploads",          // most stable — lives outside public_html and nodejs app dir
    "/home/u628156753/nodejs/uploads",   // may work when nodejs symlink resolves
  ];

  for (const candidate of persistentCandidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      // Verify we can actually write here
      const testFile = path.join(candidate, ".write_test");
      fs.writeFileSync(testFile, "ok");
      fs.unlinkSync(testFile);
      console.log("=== Persistent uploads dir in use:", candidate, "===");
      return candidate;
    } catch (_) {
      // This path isn't writable or reachable — try next
    }
  }

  // Default fallback to local project uploads folder
  const localUploads = path.resolve(__dirname, "../uploads");
  if (!fs.existsSync(localUploads)) {
    try { fs.mkdirSync(localUploads, { recursive: true }); } catch (_) {}
  }
  console.warn("=== WARNING: Falling back to local uploads dir (not persistent on Hostinger):", localUploads, "===");
  return localUploads;
}

export function findFileInAllUploadLocations(filename) {
  const cleanFilename = path.basename(filename);
  const candidatePaths = [
    path.join(getUploadsDir(), cleanFilename),
    path.join("/home/u628156753/uploads", cleanFilename),          // most stable persistent dir
    path.join("/home/u628156753/public_html/uploads", cleanFilename),
    path.join("/home/u628156753/nodejs/uploads", cleanFilename),
    path.resolve(__dirname, "../uploads", cleanFilename),
    path.resolve(__dirname, "../../uploads", cleanFilename),
  ];

  // Dynamic discovery across all Hostinger version build directories
  try {
    const versionsDir = path.resolve(__dirname, "../../..");
    if (fs.existsSync(versionsDir)) {
      const versionFolders = fs.readdirSync(versionsDir);
      for (const vf of versionFolders) {
        candidatePaths.push(path.join(versionsDir, vf, "nodejs", "uploads", cleanFilename));
        candidatePaths.push(path.join(versionsDir, vf, "uploads", cleanFilename));
      }
    }
  } catch (_) {}

  // Fallback domain-based versions path
  try {
    const altVersionsDir = "/home/u628156753/hbuilds/versions";
    if (fs.existsSync(altVersionsDir)) {
      const versionFolders = fs.readdirSync(altVersionsDir);
      for (const vf of versionFolders) {
        candidatePaths.push(path.join(altVersionsDir, vf, "nodejs", "uploads", cleanFilename));
        candidatePaths.push(path.join(altVersionsDir, vf, "uploads", cleanFilename));
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
