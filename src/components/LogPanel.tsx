import { useMemo } from "react";
import { useLogStore } from "../hooks/log";
import { ansiColorFormatter, type LogRecord } from "@logtape/logtape";
import { parse, ansicolor, type RGBValues } from "ansicolor";
import { VList } from "virtua";
import { useDiagnostics } from "../hooks/diagnostics";
import useSettingsStore from "../hooks/settings";

export default function LogPanel() {
  const settings = useSettingsStore();
  const records = useLogStore((state) => state.records);
  useDiagnostics();

  if (!settings.enable.logPanel) return null;

  return (
    <div className="box small far logs ">
      <VList>
        {records.map((record, i) => (
          <Row key={i} record={record} />
        ))}
      </VList>
    </div>
  );
}

function Row({ record }: { record: LogRecord }) {
  const formatted = useMemo(() => format(record), [record]);

  return <div>{formatted}</div>;
}
function format(record: LogRecord) {
  const formatter = ansiColorFormatter;
  const parsed = parse(formatter(record));
  return parsed.spans.map((span, i) => {
    let color = undefined;
    let backgroundColor = undefined;

    if (span.color?.name !== undefined) {
      const rgb = ansicolor.rgb[span.color?.name as keyof RGBValues];
      color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
    if (span.bgColor?.name !== undefined) {
      const rgb = ansicolor.rgb[span.bgColor?.name as keyof RGBValues];
      backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
    return (
      <span
        key={i}
        style={{
          backgroundColor,
          color,
          fontWeight: span.bold ? "bold" : "normal",
          fontStyle: span.italic ? "italic" : "normal",
        }}
      >
        {span.text}
      </span>
    );
  });
}
