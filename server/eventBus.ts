import { EventEmitter } from "node:events";

export type AppEventType =
  | "triplogs:changed"
  | "weeklysummary:changed"
  | "settlements:changed"
  | "investments:changed";

type AppEvent = { type: AppEventType; payload?: any };

class Bus extends EventEmitter {
  broadcast(e: AppEvent) {
    this.emit("event", e);
  }
}

export const bus = new Bus();

export function broadcast(type: AppEventType, payload?: any) {
  bus.broadcast({ type, payload });
}
