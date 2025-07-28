import { getLogger } from "@logtape/logtape";
import { useProgramStore } from "./program";
import { useEffect, useRef } from "react";

const logger = getLogger(["jacket", "compilation"]);

export function useDiagnostics() {
  const program = useProgramStore((state) => state.program);
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const item of program.filter(
      (item) => item.value instanceof GPUShaderModule
    )) {
      if (seen.current.has(item.id)) continue;
      seen.current.add(item.id);
      (item.value as GPUShaderModule).getCompilationInfo().then((info) => {
        for (const message of info.messages) {
          switch (message.type) {
            case "info":
              logger.info(message.message);
              break;
            case "warning":
              logger.warning(message.message);
              break;
            case "error":
              logger.error(message.message);
              break;
          }
        }
      });
    }
  }, [program]);
}
