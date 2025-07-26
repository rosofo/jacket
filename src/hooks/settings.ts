import { create } from "zustand/react";

type SettingsStore = {
  enable: {
    logPanel: boolean;
    filePanel: boolean;
    graphPanel: boolean;
    canvasPanel: boolean;
  };
  setEnabled: (name: string, enabled: boolean) => void;
};
const useSettingsStore = create<SettingsStore>((set) => ({
  enable: {
    canvasPanel: true,
    filePanel: true,
    graphPanel: true,
    logPanel: true,
  },
  setEnabled: (name: string, enabled: boolean) => {
    set((settings) => ({ enable: { ...settings.enable, [name]: enabled } }));
  },
}));

export default useSettingsStore;
