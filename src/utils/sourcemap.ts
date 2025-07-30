import sourceMap from "source-map-js";
export async function getSourceAt(
  files: Record<string, string>,
  line: number,
  column: number
) {
  const map = files["main.js.map"];
  if (map === undefined) return;
  const consumer = new sourceMap.SourceMapConsumer(JSON.parse(map));
  return consumer.originalPositionFor({ line, column });
}

export function parsePositionFromStacktrace(stacktrace: string) {
  let [line, column] = stacktrace.split(":").slice(-2);
  column = column.slice(0, -1); // get rid of trailing `)`
  return { line, column };
}
