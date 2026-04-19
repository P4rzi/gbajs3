import { useEffect, useState } from 'react';

import {
  mGBAEmulator,
  type GBAEmulator
} from '../emulator/mgba/mgba-emulator.tsx';

const emulatorInitTimeoutMs = 15000;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Emulator initialization timed out after ${ms}ms`)),
        ms
      )
    )
  ]);

export const useEmulator = (canvas: HTMLCanvasElement | null) => {
  const [emulator, setEmulator] = useState<GBAEmulator | null>(null);
  const [emulatorLoadError, setEmulatorLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const initialize = async () => {
      if (canvas) {
        setEmulator(null);
        setEmulatorLoadError(null);

        const { default: mGBA } = await import('@thenick775/mgba-wasm');
        const Module = await withTimeout(mGBA({ canvas }), emulatorInitTimeoutMs);

        const mGBAVersion =
          Module.version.projectName + ' ' + Module.version.projectVersion;
        console.log(mGBAVersion);

        await Module.FSInit();

        const emulator = mGBAEmulator(Module);

        if (!isCancelled) {
          setEmulator(emulator);
        }
      }
    };

    void initialize().catch((error: unknown) => {
      console.error('Failed to initialize emulator:', error);

      if (!isCancelled) {
        setEmulator(null);
        setEmulatorLoadError(
          error instanceof Error
            ? error
            : new Error('Unknown emulator initialization failure')
        );
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [canvas]);

  return { emulator, emulatorLoadError };
};
