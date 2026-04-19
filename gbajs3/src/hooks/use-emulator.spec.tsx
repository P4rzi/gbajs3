import { renderHook, waitFor } from '@testing-library/react';
import mGBA, { type mGBAEmulator } from '@thenick775/mgba-wasm';
import { describe, expect, it, vi } from 'vitest';

import { useEmulator } from './use-emulator.tsx';
import * as mgbaEmulatorModule from '../emulator/mgba/mgba-emulator.tsx';

vi.mock('@thenick775/mgba-wasm', () => ({
  default: vi.fn()
}));

describe('useEmulator', () => {
  it('returns null when canvas is null', () => {
    const { result } = renderHook(() => useEmulator(null));

    expect(result.current.emulator).toBeNull();
    expect(result.current.emulatorLoadError).toBeNull();
  });

  it('initializes mGBA and returns the wrapped emulator when canvas exists', async () => {
    const canvas = {} as HTMLCanvasElement;
    const fsInitSpy: () => Promise<void> = vi.fn().mockResolvedValue(undefined);
    const module = {
      version: {
        projectName: 'mGBA',
        projectVersion: '1.0.0'
      },
      FSInit: fsInitSpy
    } as mGBAEmulator;
    const emulator = {};

    vi.mocked(mGBA).mockResolvedValue(module);
    vi.spyOn(mgbaEmulatorModule, 'mGBAEmulator').mockReturnValue(
      emulator as mgbaEmulatorModule.GBAEmulator
    );
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      /* empty */
    });

    const { result } = renderHook(() => useEmulator(canvas));

    await waitFor(() => {
      expect(result.current.emulator).toBe(emulator);
    });

    expect(mGBA).toHaveBeenCalledWith({ canvas });
    expect(fsInitSpy).toHaveBeenCalledOnce();
    expect(mgbaEmulatorModule.mGBAEmulator).toHaveBeenCalledWith(module);
    expect(consoleLogSpy).toHaveBeenCalledWith('mGBA 1.0.0');
    expect(result.current.emulatorLoadError).toBeNull();
  });

  it('captures initialization failures', async () => {
    const canvas = {} as HTMLCanvasElement;
    const emulatorError = new Error('SharedArrayBuffer is not available');
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    vi.mocked(mGBA).mockRejectedValueOnce(emulatorError);

    const { result } = renderHook(() => useEmulator(canvas));

    await waitFor(() => {
      expect(result.current.emulatorLoadError).toBe(emulatorError);
    });

    expect(result.current.emulator).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize emulator:',
      emulatorError
    );
  });
});
