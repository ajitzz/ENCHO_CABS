import { useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";

export function useServerEvents(queryClient: QueryClient) {
  useEffect(() => {
    const es = new EventSource("/api/events");

    es.addEventListener("triplogs:changed", () => {
      // Trip Logs changed → everything that depends on trip data
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey[0];
        if (typeof k !== 'string') return false;
        return k === "/api/trips" || k.startsWith("/api/trips/") || 
               k.startsWith("/api/weekly-summary") || 
               k.startsWith("/api/driver-rent-logs") ||
               k === "/api/settlements" ||
               k.startsWith("/api/dashboard");
      }});
    });

    es.addEventListener("weeklysummary:changed", () => {
      // Manual fields changed → affects settlements + any open weekly-summary/drivers-payments
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey[0];
        if (typeof k !== 'string') return false;
        return k.startsWith("/api/weekly-summary") || 
               k.startsWith("/api/driver-rent-logs") || 
               k === "/api/settlements";
      }});
    });

    es.addEventListener("settlements:changed", () => {
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey[0];
        if (typeof k !== 'string') return false;
        return k === "/api/settlements" || k.startsWith("/api/dashboard");
      }});
    });

    es.onerror = () => {
      // SSE will auto-reconnect; no-op
    };

    return () => es.close();
  }, [queryClient]);
}
