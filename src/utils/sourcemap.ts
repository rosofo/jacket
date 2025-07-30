import sourceMap from "source-map-js";
export function getSourceAt(
  files: Record<string, string>,
  line: number,
  column: number
) {
  const map = files["main.js.map"];
  if (map === undefined) return;
  const consumer = new sourceMap.SourceMapConsumer(JSON.parse(map));
  return consumer.originalPositionFor({ line, column });
}

// bad.
export function parsePositionFromStacktrace(stacktrace: string) {
  const matches = [...stacktrace.matchAll(/blob:.*?:(\d+:\d+)/g)];
  const match = matches.slice(-1)[0];
  if (match !== undefined) {
    const pos = match[1];
    const [line, column] = pos.split(":");

    return { line, column };
  }
}

export function translateError(error: unknown, files: Record<string, string>) {
  const err = error as Error;
  const position = parsePositionFromStacktrace(err.stack!);
  const origPosition = getSourceAt(
    files,
    parseInt(position!.line),
    parseInt(position!.column)
  );
  let line, column;
  let filepath;
  if (origPosition === undefined) {
    line = position!.line;
    column = position!.column;
  } else {
    line = origPosition.line;
    column = origPosition.column;
    filepath = origPosition.source;
  }
  return { filepath, line, column, err };
}
