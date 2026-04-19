import { useAuthContext, useEmulatorContext, useRunningContext } from '../context.tsx';
import { useInterval } from '../use-interval.ts';

const AUTO_SAVE_INTERVAL_MS = 60_000;

export const useAutoSaveToServer = () => {
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { accessToken } = useAuthContext();
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;

  const isActive = isRunning && !!accessToken;

  useInterval(() => {
    if (!emulator) return;

    const saved = emulator.forceAutoSaveState();
    if (!saved) return;

    const autoSaveStateData = emulator.getAutoSaveState();
    if (!autoSaveStateData?.data || !autoSaveStateData.autoSaveStateName) return;

    const file = new File(
      [autoSaveStateData.data],
      autoSaveStateData.autoSaveStateName,
      { type: 'application/octet-stream' }
    );

    const formData = new FormData();
    formData.append('save', file);

    fetch(`${apiLocation}/api/save/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData
    })
      .then((res) => {
        if (res.ok) {
          console.log(
            `[auto-save] uploaded "${autoSaveStateData.autoSaveStateName}" at ${new Date().toISOString()}`
          );
        } else {
          console.warn(
            `[auto-save] upload failed for "${autoSaveStateData.autoSaveStateName}": HTTP ${res.status}`
          );
        }
      })
      .catch((err: unknown) => {
        console.error('[auto-save] upload error:', err);
      });
  }, isActive ? AUTO_SAVE_INTERVAL_MS : null);
};
