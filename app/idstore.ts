"use client";

// Per-browser identity overrides (display name + photo), keyed by wallet.
// localStorage only — visible on this device; syncing it for everyone needs a
// backend and can come later. Every access is guarded: storage can be blocked.

export interface LocalProfile {
  name?: string;
  photo?: string; // data URL, already resized
}

const key = (address: string) => `presage-profile-${address.toLowerCase()}`;

export function loadProfile(address: string): LocalProfile {
  try {
    return JSON.parse(localStorage.getItem(key(address)) ?? "{}") as LocalProfile;
  } catch {
    return {};
  }
}

export function saveProfile(address: string, patch: Partial<LocalProfile>): LocalProfile {
  const next = { ...loadProfile(address), ...patch };
  if (!next.name) delete next.name;
  if (!next.photo) delete next.photo;
  try {
    localStorage.setItem(key(address), JSON.stringify(next));
    window.dispatchEvent(new Event("presage-profile"));
  } catch {
    /* storage full/blocked — the in-memory value still renders this session */
  }
  return next;
}

/** File -> small square JPEG data URL (256px), so storage stays tiny. */
export function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas unavailable"));
      // Cover-crop to a square from the center.
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    img.src = url;
  });
}

