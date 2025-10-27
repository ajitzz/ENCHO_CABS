import { useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";

export function useServerEvents(queryClient: QueryClient) {
  useEffect(() => {
    const es = new EventSource("/api/events");

    es.addEventListener("triplogs:changed", () => {
      // Trip Logs changed → everything that depends on trip data
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey[0];
        return k === "trip-logs" || k === "weekly-summary" || k === "drivers-payments" || k === "settlements";
      }});
    });

    es.addEventListener("weeklysummary:changed", () => {
      // Manual fields changed → affects settlements + any open weekly-summary/drivers-payments
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey[0];
        return k === "weekly-summary" || k === "drivers-payments" || k === "settlements";
      }});
    });

    es.addEventListener("settlements:changed", () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "settlements" });
    });

    es.onerror = () => {
      // SSE will auto-reconnect; no-op
    };

    return () => es.close();
  }, [queryClient]);
}
