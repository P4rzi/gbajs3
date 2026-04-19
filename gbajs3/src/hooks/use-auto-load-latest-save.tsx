import { useCallback } from 'react';

import { useAddCallbacks } from './emulator/use-add-callbacks.tsx';
import { useAuthContext, useEmulatorContext } from './context.tsx';
import { useListSaves, type SaveItem } from './use-list-saves.tsx';
import { useLoadSave } from './use-load-save.tsx';

export const findLatestSaveForRom = (
  saveList: SaveItem[],
  romName: string
): string | null => {
  const baseName = romName.replace(/\.[^.]+$/, '');
  const baseNameLower = baseName.toLowerCase();
  const matches = saveList
    .filter((s) => s.filename.toLowerCase().startsWith(baseNameLower))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  return matches[0]?.filename ?? null;
};

export const useAutoLoadLatestSave = () => {
  const { accessToken } = useAuthContext();
  const { emulator } = useEmulatorContext();
  const { syncActionIfEnabled } = useAddCallbacks();
  const { data: saveList } = useListSaves({ enabled: !!accessToken });

  const { mutate: executeLoadSave } = useLoadSave({
    onSuccess: (file) => {
      emulator?.uploadSaveOrSaveState(file, syncActionIfEnabled);
    }
  });

  const loadForRom = useCallback(
    (romName: string) => {
      if (!saveList?.length) return;
      const saveName = findLatestSaveForRom(saveList, romName);
      if (saveName) executeLoadSave({ saveName });
    },
    [saveList, executeLoadSave]
  );

  return loadForRom;
};
