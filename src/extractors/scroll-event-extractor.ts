import {
  EventHandler,
  FeatureExtractor,
  FeatureResult,
} from "../feature-extractor";
import { EventPort, MetadataPort } from "../ports";
import { StoredEvent } from "../storage";
import { EventPayloads, EventType } from "../types/events";

// Define constants for calculation
const ACTIVE_SCROLLING_THRESHOLD_MS = 50; // Time difference threshold for active scrolling

// Stored event includes timestamp
interface StoredScrollEvent {
  timestamp: number;
  deltaY: number;
}

/**
 * Defines the structure for simplified scroll activity features.
 */
export interface ScrollActivityFeatures {
  hasScrollEvents: boolean;
  hasActiveScrolling: boolean;
}

export class ScrollEventExtractor extends FeatureExtractor<ScrollActivityFeatures> {
  private scrollEvents: StoredScrollEvent[] = [];

  constructor(metadataProvider: MetadataPort, eventsProvider: EventPort) {
    super(metadataProvider, eventsProvider);
  }

  // Handler for scroll events
  private handleScroll = (payload: EventPayloads["scroll"]) => {
    this.scrollEvents.push({
      timestamp: payload.timestamp,
      deltaY: payload.scrollY, // Assuming vertical scroll focus
    });
  };

  // Process events loaded from storage
  processEvents(events: StoredEvent[]): void {
    const scrollEvents = events
      .filter(
        (event): event is StoredEvent<"scroll"> => event.type === "scroll"
      )
      .map((event) => ({
        timestamp: event.timestamp,
        deltaY: event.data.scrollY,
      }));

    if (scrollEvents.length > 0) {
      this.scrollEvents = scrollEvents;
    }
  }

  // Provide event handlers to the manager
  getEventHandlers(): EventHandler<EventType>[] {
    return [
      {
        eventType: "scroll",
        handler: this.handleScroll,
      },
    ] as EventHandler<EventType>[];
  }

  getDefaultFeatures(): ScrollActivityFeatures {
    return {
      hasScrollEvents: false,
      hasActiveScrolling: false,
    };
  }

  private hasActiveScrolling(): boolean {
    if (this.scrollEvents.length < 2) return false;

    // Group scroll events where time difference is < 50ms
    const sortedEvents = [...this.scrollEvents].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    let activeScrollGroups = [];
    let currentGroup = [sortedEvents[0]];

    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff =
        sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
      if (timeDiff < ACTIVE_SCROLLING_THRESHOLD_MS) {
        currentGroup.push(sortedEvents[i]);
      } else if (currentGroup.length > 0) {
        activeScrollGroups.push([...currentGroup]);
        currentGroup = [sortedEvents[i]];
      }
    }

    if (currentGroup.length > 0) {
      activeScrollGroups.push(currentGroup);
    }

    return activeScrollGroups.some((group) => group.length > 1);
  }

  extractFeatures(): FeatureResult<ScrollActivityFeatures> {
    const features: ScrollActivityFeatures = {
      hasScrollEvents: this.scrollEvents.length > 0,
      hasActiveScrolling: this.hasActiveScrolling(),
    };

    return {
      features,
      hasData: this.scrollEvents.length > 0,
    };
  }
}
