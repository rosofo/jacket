import { useMemo } from "react";

export function useDetectFeatures() {
  const hasShowDirectoryPicker = useMemo(
    () => window.showDirectoryPicker !== undefined,
    []
  );
  const hasWebGPU = useMemo(() => navigator.gpu !== undefined, []);
  return {
    hasShowDirectoryPicker,
    hasWebGPU,
  };
}
