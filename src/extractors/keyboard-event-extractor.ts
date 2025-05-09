import { standardDeviation } from "simple-statistics";
import {
  EventHandler,
  FeatureExtractor,
  FeatureResult,
} from "../feature-extractor";
import { EventPort, MetadataPort } from "../ports";
import { StoredEvent } from "../storage";
import { EventPayloads, EventType } from "../types/events";

// Define constants for calculation
const TYPING_BURST_THRESHOLD_MS = 3000; // Time between keys to be considered different bursts

/**
 * Defines the structure for keyboard activity features.
 */
export interface KeyboardActivityFeatures {
  hasTypingEvents: boolean;
  keyboardTypingConsistency: number;
}

export class KeyboardEventExtractor extends FeatureExtractor<KeyboardActivityFeatures> {
  private keyEvents: EventPayloads["keydown"][] = [];

  constructor(metadataProvider: MetadataPort, eventsProvider: EventPort) {
    super(metadataProvider, eventsProvider);
  }

  // Handler for keydown events
  private handleKeydown = (payload: EventPayloads["keydown"]) => {
    this.keyEvents.push(payload);
  };

  // Process events loaded from storage
  processEvents(events: StoredEvent[]): void {
    const keydownEvents = events
      .filter(
        (event): event is StoredEvent<"keydown"> => event.type === "keydown",
      )
      .map((event) => event.data);

    if (keydownEvents.length > 0) {
      this.keyEvents = keydownEvents;
    }
  }

  // Provide event handlers to the manager
  getEventHandlers(): EventHandler<EventType>[] {
    return [
      {
        eventType: "keydown",
        handler: this.handleKeydown,
      },
    ] as EventHandler<EventType>[];
  }

  getDefaultFeatures(): KeyboardActivityFeatures {
    return {
      hasTypingEvents: false,
      keyboardTypingConsistency: -1,
    };
  }

  private calculateTypingConsistency(): number {
    if (this.keyEvents.length < 2) return -1;

    // Sort events by timestamp
    const sortedEvents = [...this.keyEvents].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Identify burst groups where time diff between events is > 3000ms
    const burstGroups = [];
    let currentBurst = [sortedEvents[0]];

    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff =
        sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
      if (timeDiff > TYPING_BURST_THRESHOLD_MS) {
        if (currentBurst.length > 1) {
          burstGroups.push([...currentBurst]);
        }
        currentBurst = [sortedEvents[i]];
      } else {
        currentBurst.push(sortedEvents[i]);
      }
    }

    // Add the last burst if it exists
    if (currentBurst.length > 1) {
      burstGroups.push(currentBurst);
    }

    if (burstGroups.length === 0) return -1;

    // Calculate STD of time between events within each burst
    const burstConsistencies = burstGroups.map((burst) => {
      const intervals = [];
      for (let i = 1; i < burst.length; i++) {
        intervals.push(burst[i].timestamp - burst[i - 1].timestamp);
      }
      if (intervals.length === 0) return 0;

      const stdDev = intervals.length > 1 ? standardDeviation(intervals) : 0;
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // Lower ratio means more consistent typing
      return mean > 0 ? stdDev / mean : 0;
    });

    // Average consistency across all bursts (1 - avg to make higher values mean more consistent)
    const avgConsistency =
      burstConsistencies.reduce((a, b) => a + b, 0) / burstConsistencies.length;
    return 1 - Math.min(avgConsistency, 1); // Normalize to 0-1 range, higher is more consistent
  }

  extractFeatures(): FeatureResult<KeyboardActivityFeatures> {
    const typingConsistency = this.calculateTypingConsistency();

    const features: KeyboardActivityFeatures = {
      hasTypingEvents: this.keyEvents.length > 0,
      keyboardTypingConsistency: typingConsistency,
    };

    return {
      features,
      hasData: this.keyEvents.length > 0,
    };
  }
}
