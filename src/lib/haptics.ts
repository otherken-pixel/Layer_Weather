import { Capacitor } from "@capacitor/core";

async function getHapticsPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    return Haptics;
  } catch {
    return null;
  }
}

export async function hapticLight(): Promise<void> {
  const h = await getHapticsPlugin();
  if (h) {
    const { ImpactStyle } = await import("@capacitor/haptics");
    await h.impact({ style: ImpactStyle.Light }).catch(() => {});
  } else {
    try { navigator.vibrate?.(8); } catch { /* ignore */ }
  }
}

export async function hapticSuccess(): Promise<void> {
  const h = await getHapticsPlugin();
  if (h) {
    const { NotificationType } = await import("@capacitor/haptics");
    await h.notification({ type: NotificationType.Success }).catch(() => {});
  } else {
    try { navigator.vibrate?.([10, 40, 20]); } catch { /* ignore */ }
  }
}
