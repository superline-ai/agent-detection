import { EventPayloads, EventType } from "../types/events";

/**
 * Configuration for event throttling
 */
export interface ThrottleConfig {
  /**
   * Map of event types to their throttle times in milliseconds
   */
  eventThrottleTimes: Map<EventType, number>;
}

/**
 * Default throttle configuration
 */
export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  eventThrottleTimes: new Map<EventType, number>([
    ["mousemove", 50],
    ["scroll", 100],
    ["keydown", 50],
    ["keyup", 50],
  ]),
};

/**
 * Creates a throttled event handler for high-frequency events based on event timestamps
 * @param eventType The type of event to throttle
 * @param handler The original handler function to be called with throttled events
 * @param config Configuration for throttling
 * @returns A function that handles incoming events with throttling applied based on their timestamps
 */
export function createThrottledEventHandler<T extends EventType>(
  eventType: T,
  handler: (payload: EventPayloads[T]) => void,
  config: ThrottleConfig = DEFAULT_THROTTLE_CONFIG
): (payload: EventPayloads[T]) => void {
  // Only apply throttling to configured event types
  if (!config.eventThrottleTimes.has(eventType)) {
    return handler;
  }

  const throttleTimeMs = config.eventThrottleTimes.get(eventType)!;
  let lastProcessedTimestamp = 0;
  let pendingEvent: EventPayloads[T] | null = null;

  return (payload: EventPayloads[T]) => {
    const currentTimestamp = payload.timestamp;

    // If this is the first event or it's been longer than the throttle time
    // since the last processed event, process it immediately (leading event)
    if (
      lastProcessedTimestamp === 0 ||
      currentTimestamp - lastProcessedTimestamp >= throttleTimeMs
    ) {
      lastProcessedTimestamp = currentTimestamp;
      handler(payload);
      pendingEvent = null;
    }
    // Otherwise, store it as the pending event (trailing event)
    else {
      pendingEvent = payload;

      // Schedule processing the pending event when the throttle time elapses
      // We calculate real-time waiting based on the timestamp difference
      const timeToNextAllowedEvent =
        throttleTimeMs - (currentTimestamp - lastProcessedTimestamp);

      setTimeout(() => {
        // Only process if this is still the pending event (hasn't been replaced)
        if (pendingEvent === payload) {
          lastProcessedTimestamp = pendingEvent.timestamp;
          handler(pendingEvent);
          pendingEvent = null;
        }
      }, timeToNextAllowedEvent);
    }
  };
}
