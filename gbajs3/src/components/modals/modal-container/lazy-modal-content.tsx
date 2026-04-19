import {
  Suspense,
  lazy,
  type ComponentType,
  type LazyExoticComponent
} from 'react';

import { ModalSuspenseFallback } from './modal-suspense-fallback.tsx';

import type { ModalState } from '../../../context/modal/modal-context.tsx';

type LazyModalComponent<TProps = object> = LazyExoticComponent<
  ComponentType<TProps>
>;

type LazyNamedModal = <TModule, TProps extends object>(
  load: () => Promise<TModule>,
  pick: (module: TModule) => ComponentType<TProps>
) => LazyModalComponent<TProps>;

const staleChunkReloadKey = 'gbajs3:stale-chunk-reload';

const dynamicImportFailurePattern =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|ChunkLoadError/i;

export const isDynamicImportFailure = (error: unknown): error is Error =>
  error instanceof Error && dynamicImportFailurePattern.test(error.message);

const clearPwaRuntimeState = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }
};

const reloadOnceAfterDynamicImportFailure = async (error: unknown) => {
  if (
    typeof window === 'undefined' ||
    typeof sessionStorage === 'undefined' ||
    !isDynamicImportFailure(error)
  ) {
    return false;
  }

  if (sessionStorage.getItem(staleChunkReloadKey) === '1') {
    sessionStorage.removeItem(staleChunkReloadKey);
    return false;
  }

  sessionStorage.setItem(staleChunkReloadKey, '1');

  try {
    await clearPwaRuntimeState();
  } catch (cleanupError) {
    console.error('Failed to clear cached assets after a dynamic import failure.', cleanupError);
  }

  window.location.reload();
  return true;
};

const lazyNamedModal: LazyNamedModal = (load, pick) =>
  lazy(async () => {
    try {
      const module = await load();

      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(staleChunkReloadKey);
      }

      return {
        default: pick(module)
      };
    } catch (error) {
      if (await reloadOnceAfterDynamicImportFailure(error)) {
        return await new Promise<never>(() => undefined);
      }

      throw error;
    }
  });

const modals = {
  about: lazyNamedModal(
    () => import('../about.tsx'),
    (module) => module.AboutModal
  ),
  cheats: lazyNamedModal(
    () => import('../cheats.tsx'),
    (module) => module.CheatsModal
  ),
  controls: lazyNamedModal(
    () => import('../controls.tsx'),
    (module) => module.ControlsModal
  ),
  downloadSave: lazyNamedModal(
    () => import('../download-save.tsx'),
    (module) => module.DownloadSaveModal
  ),
  emulatorSettings: lazyNamedModal(
    () => import('../emulator-settings.tsx'),
    (module) => module.EmulatorSettingsModal
  ),
  fileSystem: lazyNamedModal(
    () => import('../file-system.tsx'),
    (module) => module.FileSystemModal
  ),
  importExport: lazyNamedModal(
    () => import('../import-export.tsx'),
    (module) => module.ImportExportModal
  ),
  legal: lazyNamedModal(
    () => import('../legal.tsx'),
    (module) => module.LegalModal
  ),
  loadLocalRom: lazyNamedModal(
    () => import('../load-local-rom.tsx'),
    (module) => module.LoadLocalRomModal
  ),
  loadRom: lazyNamedModal(
    () => import('../load-rom.tsx'),
    (module) => module.LoadRomModal
  ),
  loadSave: lazyNamedModal(
    () => import('../load-save.tsx'),
    (module) => module.LoadSaveModal
  ),
  login: lazyNamedModal(
    () => import('../login.tsx'),
    (module) => module.LoginModal
  ),
  saveStates: lazyNamedModal(
    () => import('../save-states.tsx'),
    (module) => module.SaveStatesModal
  ),
  uploadFiles: lazyNamedModal(
    () => import('../upload-files.tsx'),
    (module) => module.UploadFilesModal
  ),
  uploadPublicExternalRoms: lazyNamedModal(
    () => import('../upload-public-external-roms.tsx'),
    (module) => module.UploadPublicExternalRomsModal
  ),
  uploadRomToServer: lazyNamedModal(
    () => import('../upload-rom-to-server.tsx'),
    (module) => module.UploadRomToServerModal
  ),
  uploadSaveToServer: lazyNamedModal(
    () => import('../upload-save-to-server.tsx'),
    (module) => module.UploadSaveToServerModal
  )
};

// used to make the switch below exhaustive
const assertNever = (value: never): never => {
  throw new Error(`Unhandled modal type: ${JSON.stringify(value)}`);
};

const renderModalBody = (modal: Exclude<ModalState, null>) => {
  switch (modal.type) {
    case 'about':
      return <modals.about />;
    case 'uploadFiles':
      return <modals.uploadFiles />;
    case 'controls':
      return <modals.controls />;
    case 'fileSystem':
      return <modals.fileSystem />;
    case 'emulatorSettings':
      return <modals.emulatorSettings />;
    case 'importExport':
      return <modals.importExport />;
    case 'legal':
      return <modals.legal />;
    case 'login':
      return <modals.login />;
    case 'downloadSave':
      return <modals.downloadSave />;
    case 'saveStates':
      return <modals.saveStates />;
    case 'cheats':
      return <modals.cheats />;
    case 'loadLocalRom':
      return <modals.loadLocalRom />;
    case 'loadSave':
      return <modals.loadSave />;
    case 'loadRom':
      return <modals.loadRom />;
    case 'uploadSaveToServer':
      return <modals.uploadSaveToServer />;
    case 'uploadRomToServer':
      return <modals.uploadRomToServer />;
    case 'uploadPublicExternalRoms':
      return <modals.uploadPublicExternalRoms {...modal.props} />;
    default:
      assertNever(modal);
  }
};

export const LazyModalContent = ({ modal }: { modal: ModalState }) => {
  if (!modal) return null;

  return (
    <Suspense fallback={<ModalSuspenseFallback />}>
      {renderModalBody(modal)}
    </Suspense>
  );
};
