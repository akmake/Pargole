/**
 * Platform-aware file export / share.
 *
 * On a native Capacitor build (Android/iOS) a plain `<a download>` blob click does
 * NOT surface a file to the user, so we write the file to the device and open the
 * native share sheet instead. In a regular browser we keep the EXACT original
 * behaviour (blob download / navigator.share), so the web app is unchanged.
 */
import { Capacitor } from '@capacitor/core';

const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

/** base64 (no data: prefix) → Blob, for the web download fallback of binary files. */
function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function webDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Save a generated file and let the user keep/share it.
 *
 * @param {Object}  opts
 * @param {string}  opts.filename   e.g. "pergola-123.pdf"
 * @param {string}  opts.data       UTF-8 text, OR base64 string when `base64: true`
 * @param {string}  opts.mimeType   e.g. "application/pdf"
 * @param {boolean} [opts.base64]   true when `data` is base64-encoded binary
 * @param {string}  [opts.dialogTitle] native share sheet title
 */
export async function exportFile({ filename, data, mimeType, base64 = false, dialogTitle }) {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      ...(base64 ? {} : { encoding: Encoding.UTF8 }),
    });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });

    try {
      await Share.share({ title: dialogTitle || filename, url: uri });
    } catch (_) {
      /* user dismissed the share sheet */
    }
    return;
  }

  // Web: identical to the original behaviour.
  const blob = base64 ? base64ToBlob(data, mimeType) : new Blob([data], { type: mimeType });
  webDownload(blob, filename);
}

/**
 * Share plain text / a link. Native uses the OS share sheet; web uses the Web
 * Share API when present (same as the original), otherwise no-op.
 */
export async function shareContent({ title, text, url }) {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    try { await Share.share({ title, text, url }); } catch (_) { /* cancelled */ }
    return true;
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ title, text, url }); } catch (_) { /* cancelled */ }
    return true;
  }
  return false;
}

export { isNative };
