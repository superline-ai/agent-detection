import {
  EventHandler,
  FeatureExtractor,
  FeatureResult,
} from "../feature-extractor";
import { EventPort, MetadataPort } from "../ports";
import { StoredEvent } from "../storage";
import { EventPayloads, EventType } from "../types/events";

const ACTIVE_MOVEMENT_THRESHOLD_MS = 50; // Time difference threshold for active movements

export interface ActivityFeatures {
  hasMouseEvents: boolean;
  hasClickEvents: boolean;
  hasActiveMouseMovement: boolean;
}

export class ClickEventExtractor extends FeatureExtractor<ActivityFeatures> {
  private mouseMoves: EventPayloads["mousemove"][] = [];
  private clicks: EventPayloads["click"][] = [];

  constructor(metadataProvider: MetadataPort, eventsProvider: EventPort) {
    super(metadataProvider, eventsProvider);
  }

  // Handler for mousemove events
  private handleMouseMove = (payload: EventPayloads["mousemove"]) => {
    this.mouseMoves.push(payload);
  };

  // Handler for click events
  private handleClick = (payload: EventPayloads["click"]) => {
    this.clicks.push(payload);
  };

  // Process events loaded from storage
  processEvents(events: StoredEvent[]): void {
    // Process mousemove events
    const mouseMoveEvents = events
      .filter(
        (event): event is StoredEvent<"mousemove"> => event.type === "mousemove"
      )
      .map((event) => event.data);

    if (mouseMoveEvents.length > 0) {
      this.mouseMoves = mouseMoveEvents;
    }

    // Process click events
    const clickEvents = events
      .filter((event): event is StoredEvent<"click"> => event.type === "click")
      .map((event) => event.data);

    if (clickEvents.length > 0) {
      this.clicks = clickEvents;
    }
  }

  // Provide event handlers to the manager
  getEventHandlers(): EventHandler<EventType>[] {
    return [
      {
        eventType: "mousemove",
        handler: this.handleMouseMove,
      },
      {
        eventType: "click",
        handler: this.handleClick,
      },
    ] as EventHandler<EventType>[];
  }

  getDefaultFeatures(): ActivityFeatures {
    return {
      hasMouseEvents: false,
      hasClickEvents: false,
      hasActiveMouseMovement: false,
    };
  }

  private hasActiveMouseMovements(): boolean {
    if (this.mouseMoves.length < 2) return false;

    // Group mouse movements where time difference is < 50ms
    const sortedMoves = [...this.mouseMoves].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    let activeMovementGroups = [];
    let currentGroup = [sortedMoves[0]];

    for (let i = 1; i < sortedMoves.length; i++) {
      const timeDiff = sortedMoves[i].timestamp - sortedMoves[i - 1].timestamp;
      if (timeDiff < ACTIVE_MOVEMENT_THRESHOLD_MS) {
        currentGroup.push(sortedMoves[i]);
      } else if (currentGroup.length > 0) {
        activeMovementGroups.push([...currentGroup]);
        currentGroup = [sortedMoves[i]];
      }
    }

    if (currentGroup.length > 0) {
      activeMovementGroups.push(currentGroup);
    }

    return activeMovementGroups.some((group) => group.length > 1);
  }

  extractFeatures(): FeatureResult<ActivityFeatures> {
    const features: ActivityFeatures = {
      hasMouseEvents: this.mouseMoves.length > 0,
      hasClickEvents: this.clicks.length > 0,
      hasActiveMouseMovement: this.hasActiveMouseMovements(),
    };

    return {
      features,
      hasData: this.mouseMoves.length > 0 || this.clicks.length > 0,
    };
  }
}
