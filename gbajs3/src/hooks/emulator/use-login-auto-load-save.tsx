import { useEffect, useRef } from 'react';

import { useAuthContext, useEmulatorContext, useRunningContext } from '../context.tsx';
import { useListSaves } from '../use-list-saves.tsx';
import { useLoadSave } from '../use-load-save.tsx';
import { useAddCallbacks } from './use-add-callbacks.tsx';
import { findLatestSaveForRom } from '../use-auto-load-latest-save.tsx';

/**
 * When the user logs in while a game is already running,
 * automatically loads the most recent server save state for that game.
 */
export const useLoginAutoLoadSave = () => {
  const { accessToken } = useAuthContext();
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { syncActionIfEnabled } = useAddCallbacks();

  const { data: saveList } = useListSaves({ enabled: !!accessToken });

  const { mutate: executeLoadSave } = useLoadSave({
    onSuccess: (file) => {
      emulator?.uploadSaveOrSaveState(file, syncActionIfEnabled);
    }
  });

  // Track the last token for which we auto-loaded, so we only trigger once per login
  const autoLoadedForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken || !saveList || !isRunning) return;
    if (autoLoadedForToken.current === accessToken) return;

    const gameName = emulator?.getCurrentGameName();
    if (!gameName) return;

    const saveName = findLatestSaveForRom(saveList, gameName);
    if (saveName) {
      autoLoadedForToken.current = accessToken;
      executeLoadSave({ saveName });
    }
  }, [accessToken, saveList, isRunning, emulator, executeLoadSave]);

  // Reset when logging out
  useEffect(() => {
    if (!accessToken) autoLoadedForToken.current = null;
  }, [accessToken]);
};
