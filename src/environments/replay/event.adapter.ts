import { EventPort } from "../../ports";
import { EventPayloads, EventType, ReplayEvents } from "../../types/events";

/**
 * Adapter that implements the EventPort interface for replay environments.
 * Facilitates replaying pre-recorded events from a captured user session.
 * Allows hooking into the replay stream to analyze and evaluate recorded events.
 */
export class ReplayEventAdapter implements EventPort {
  private listeners = new Map<string, Function[]>();

  /**
   * Creates a new replay event adapter.
   *
   * @param events Array of recorded events to be replayed
   */
  constructor(private events: ReplayEvents) {}

  /**
   * Registers an event handler for the specified event type.
   * The handler will be called when replaying events of this type.
   *
   * @param evt The event type to listen for
   * @param handler The callback function to be called for matching events
   */
  on<K extends EventType>(
    evt: K,
    handler: (payload: EventPayloads[K]) => void
  ): void {
    if (!this.listeners.has(evt)) this.listeners.set(evt, []);
    this.listeners.get(evt)!.push(handler);
  }

  /**
   * Unregisters an event handler for the specified event type.
   *
   * @param evt The event type to stop listening for
   * @param handler The callback function to be removed
   */
  off<K extends EventType>(
    evt: K,
    handler: (payload: EventPayloads[K]) => void
  ): void {
    const arr = this.listeners.get(evt) || [];
    this.listeners.set(
      evt,
      arr.filter((h) => h !== handler)
    );
  }

  /**
   * Starts the replay process, triggering events in sequence.
   * Events will be delivered to registered handlers in the order they were recorded.
   *
   * @param realTime If true, events will be played with timing delays matching the original capture
   * @returns Promise that resolves when all events have been replayed
   */
  async start(realTime = false) {
    if (this.events.length === 0) return;
    let lastTs = this.events[0].timestamp;

    for (const ev of this.events) {
      if (realTime && ev.timestamp > lastTs) {
        await new Promise((r) => setTimeout(r, ev.timestamp - lastTs));
      }
      lastTs = ev.timestamp;

      // Include timestamp in the payload
      const payload = { ...ev.data, timestamp: ev.timestamp };

      for (const handler of this.listeners.get(ev.data.type) || []) {
        handler(payload);
      }
    }
  }
}
