import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { configure, type LogRecord } from "@logtape/logtape";
import { useLogStore } from "./hooks/log.ts";

function storeSink(record: LogRecord) {
  useLogStore.getState().push(record);
}
await configure({
  sinks: { store: storeSink },
  loggers: [
    { category: "jacket", lowestLevel: "info", sinks: ["store"] },
    { category: ["jacket", "user"], lowestLevel: "trace", sinks: ["store"] },
    {
      category: ["jacket", "tracking"],
      lowestLevel: "trace",
      sinks: ["store"],
    },
  ],
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
