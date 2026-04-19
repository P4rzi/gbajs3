import { Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId } from 'react';
import { BiError } from 'react-icons/bi';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useUpLoadSave } from '../../hooks/use-upload-save.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { PacmanIndicator } from '../shared/loading-indicator.tsx';
import { CenteredText } from '../shared/styled.tsx';

type DynamicBodyProps = {
  errorColor: string;
  loadingColor: string;
  respStatus: number | undefined;
  isLoading: boolean;
  hasError: boolean;
};

const DynamicBody = ({
  errorColor,
  loadingColor,
  respStatus,
  isLoading,
  hasError
}: DynamicBodyProps) => {
  let BodyContents = null;
  if (isLoading) {
    BodyContents = () => (
      <PacmanIndicator data-testid="upload-save-spinner" color={loadingColor} />
    );
  } else if (hasError) {
    BodyContents = () => (
      <ErrorWithIcon
        icon={<BiError style={{ color: errorColor }} />}
        text="Save state upload has failed"
      />
    );
  } else if (respStatus === 200) {
    BodyContents = () => (
      <CenteredText>Save state upload was successful!</CenteredText>
    );
  } else {
    BodyContents = () => (
      <CenteredText>
        Are you sure you want to upload your latest save state to the server?
      </CenteredText>
    );
  }

  return (
    <ModalBody>
      <BodyContents />
    </ModalBody>
  );
};

export const UploadSaveToServerModal = () => {
  const theme = useTheme();
  const { closeModal } = useModalContext();
  const { emulator } = useEmulatorContext();
  const uploadSaveToServerButtonId = useId();
  const {
    data,
    isPending: isLoading,
    error,
    mutate: executeUploadSave
  } = useUpLoadSave();

  return (
    <>
      <ModalHeader title="Send Save to Server" />
      <DynamicBody
        errorColor={theme.errorRed}
        loadingColor={theme.gbaThemeBlue}
        isLoading={isLoading}
        hasError={!!error}
        respStatus={data?.status}
      />
      <ModalFooter>
        <Button
          id={uploadSaveToServerButtonId}
          variant="contained"
          onClick={() => {
            let saveStateNames = emulator?.listCurrentSaveStates() ?? [];

            // Best effort: ensure at least one save state exists.
            if (!saveStateNames.length) {
              emulator?.createSaveState(0);
              saveStateNames = emulator?.listCurrentSaveStates() ?? [];
            }

            const latestSaveStateName = saveStateNames.at(-1);
            const saveStateBytes = latestSaveStateName
              ? emulator?.getSaveState(latestSaveStateName)
              : null;

            if (saveStateBytes && latestSaveStateName) {
              const saveStateBlob = new Blob([saveStateBytes.slice()]);
              const saveFile = new File([saveStateBlob], latestSaveStateName);

              executeUploadSave({ saveFile });
            }
          }}
        >
          Upload
        </Button>
        <Button variant="outlined" onClick={closeModal}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
