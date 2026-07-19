/**
 * Native shell wiring for the Capacitor build (Android/iOS).
 *
 * No-op on the web — every call is guarded so the same source runs unchanged in a
 * browser. Handles the things a wrapped web app otherwise gets wrong on a phone:
 *   - hiding the splash screen once React has painted
 *   - status-bar colour / icon style (white bar, dark icons)
 *   - the Android hardware back button (navigate back, or exit at the root)
 *   - keyboard resize behaviour so inputs aren't hidden
 */
import { Capacitor } from '@capacitor/core';

export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return;

  // ── Status bar: opaque white with dark icons (matches the app header) ──────
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    await StatusBar.setStyle({ style: Style.Light }).catch(() => {}); // Light = dark icons
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
    }
  } catch (_) { /* plugin unavailable */ }

  // ── Keyboard: push the view up so focused inputs stay visible ─────────────
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {});
    await Keyboard.setScroll?.({ isDisabled: false }).catch?.(() => {});
  } catch (_) { /* plugin unavailable */ }

  // ── Android hardware back button ──────────────────────────────────────────
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      const hash = window.location.hash || '';
      const atRoot = hash === '' || hash === '#/' || hash === '#';
      if (!atRoot && (canGoBack || window.history.length > 1)) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (_) { /* plugin unavailable */ }

  // ── Hide the splash once the UI is ready ──────────────────────────────────
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    // small delay so the first React paint is on screen before the splash lifts
    setTimeout(() => SplashScreen.hide().catch(() => {}), 250);
  } catch (_) { /* plugin unavailable */ }
}
