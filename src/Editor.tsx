import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { useEffect, useLayoutEffect, useRef } from "react";
import { basicSetup } from "./editor-setup";
import { useProgramStore } from "./hooks/program";
import { useAsyncDebouncer } from "@tanstack/react-pacer";

export default function Editor({
  onChange,
  defaultText,
}: {
  defaultText?: string;
  onChange?: (text: string | undefined) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView>(null);

  const evalProgram = useProgramStore((state) => state.evalProgram);
  const { maybeExecute: evalProgramMaybe } = useAsyncDebouncer(evalProgram, {
    wait: 500,
  });

  useEffect(() => {
    editor.current = new EditorView({
      extensions: [
        basicSetup,
        javascript(),
        EditorView.updateListener.of(() => {
          const text = editor.current?.state.sliceDoc();
          if (text === undefined) return;
          evalProgramMaybe(text);
          if (onChange !== undefined) onChange(text);
        }),
      ],
      parent: el.current!,
      doc: defaultText,
    });
    return () => {
      editor.current?.destroy();
    };
  }, [editor, defaultText, onChange, evalProgramMaybe]);
  return <div className="editor" ref={el}></div>;
}
