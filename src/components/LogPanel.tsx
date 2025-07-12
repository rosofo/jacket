import { useEffect, useMemo, useRef } from "react";
import { useLogStore } from "../hooks/log";
import {
  getTextFormatter,
  getLogger,
  ansiColorFormatter,
} from "@logtape/logtape";
import { parse, ansicolor } from "ansicolor";

export default function LogPanel() {
  const records = useLogStore((state) => state.records);
  const formatter = useRef(ansiColorFormatter);
  const formatted = useMemo(() => {
    return records.map((record) => {
      const parsed = parse(formatter.current(record));
      return (
        <div key={record.timestamp}>
          {parsed.spans.map((span, i) => {
            let color = undefined;
            let backgroundColor = undefined;

            if (span.color?.name !== undefined) {
              const rgb = ansicolor.rgb[span.color?.name];
              color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
            }
            if (span.bgColor?.name !== undefined) {
              const rgb = ansicolor.rgb[span.bgColor?.name];
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
          })}
        </div>
      );
    });
  }, [records]);

  return <div className="box small far logs scroll">{formatted}</div>;
}
