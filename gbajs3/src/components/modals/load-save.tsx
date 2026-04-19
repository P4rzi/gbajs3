import { Button } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { useEffect, useId, useRef } from 'react';
import { BiError } from 'react-icons/bi';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useListSaves } from '../../hooks/use-list-saves.tsx';
import { useLoadSave } from '../../hooks/use-load-save.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { PacmanIndicator } from '../shared/loading-indicator.tsx';
import { CenteredText } from '../shared/styled.tsx';

const SaveError = styled(ErrorWithIcon)`
  justify-content: center;
`;

export const LoadSaveModal = () => {
  const theme = useTheme();
  const { closeModal } = useModalContext();
  const { emulator } = useEmulatorContext();
  const gameName = emulator?.getCurrentGameName();
  const saveListId = useId();
  const { syncActionIfEnabled } = useAddCallbacks();
  const hasAttemptedAutoLoad = useRef(false);
  const {
    data: saveList,
    isPending: saveListLoading,
    error: saveListError,
    isPaused: saveListPaused
  } = useListSaves({ enabled: !!gameName, gameName });
  const {
    isPending: saveLoading,
    isSuccess: saveLoadSuccess,
    error: saveLoadError,
    mutateAsync: executeLoadSave
  } = useLoadSave({
    onSuccess: (file) => {
      emulator?.uploadSaveOrSaveState(file, syncActionIfEnabled);
    }
  });

  // Auto-load all save states for the current game when list is ready
  useEffect(() => {
    if (!gameName || saveListLoading || !saveList?.length) return;
    if (hasAttemptedAutoLoad.current) return;

    hasAttemptedAutoLoad.current = true;

    const loadAllSaveStates = async () => {
      for (const save of saveList) {
        await executeLoadSave({ saveName: save.filename });
      }
    };

    void loadAllSaveStates();
  }, [saveList, saveListLoading, gameName, executeLoadSave]);

  return (
    <>
      <ModalHeader title="Load Save State" />
      <ModalBody id={saveListId}>
        {saveListLoading || saveLoading ? (
          <PacmanIndicator />
        ) : saveLoadSuccess ? (
          <CenteredText>Save states loaded successfully!</CenteredText>
        ) : saveLoadError ? (
          <SaveError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Loading save state has failed"
          />
        ) : saveListError ? (
          <SaveError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Listing saves has failed"
          />
        ) : !saveList?.length || !gameName ? (
          <CenteredText>
            No save states found for this game on the server
          </CenteredText>
        ) : null}
        {saveListPaused && (
          <SaveError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Requests will resume once online"
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outlined" onClick={closeModal}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
