import { useCallback, useRef, useState } from "react";
import { useDetectFeatures } from "../hooks/detect-features";
import { animate } from "animejs";

export default function FeatureWarning() {
  const ref = useRef<HTMLDialogElement>(null);
  const browser = useDetectFeatures();
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => {
    animate(ref.current!, {
      opacity: 0,
      duration: 100,
    }).then(() => {
      setDismissed(true);
    });
  }, []);

  return (
    <dialog
      className="fixed bottom-right"
      ref={ref}
      open={
        !dismissed && (Object.values(browser).some((has) => !has) || undefined)
      }
    >
      <div className="controls top-right" onClick={dismiss}>
        <button className="control">x</button>
      </div>
      <div className="window">
        <h2>Your browser is missing features</h2>
        {!browser.hasShowDirectoryPicker && (
          <p>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_API"
              target="_blank"
            >
              File System API
            </a>
            &nbsp;- required for local file watching
          </p>
        )}
        {!browser.hasShowDirectoryPicker && (
          <p>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API"
              target="_blank"
            >
              WebGPU
            </a>
            &nbsp;- Jacket is for analyzing WebGPU code
          </p>
        )}
      </div>
    </dialog>
  );
}
