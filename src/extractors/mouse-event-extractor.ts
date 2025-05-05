import { standardDeviation } from "simple-statistics";
import {
  EventHandler,
  FeatureExtractor,
  FeatureResult,
} from "../feature-extractor";
import { EventPort, MetadataPort } from "../ports";
import { StoredEvent } from "../storage";
import { EventPayloads, EventType } from "../types/events";

/**
 * Defines the structure for features extracted from mouse events.
 */
export interface MouseEventFeatures {
  avgSpeed: number;
  stdSpeed: number;
  idleCount: number;
  mouseMoveCount: number;
}

// Minimum number of move events needed for feature extraction
const MIN_MOVE_EVENTS = 5;

// Time threshold to consider as idle period (ms)
const IDLE_THRESHOLD_MS = 2000;

export class MouseEventExtractor extends FeatureExtractor<MouseEventFeatures> {
  private mouseMoves: EventPayloads["mousemove"][] = [];

  constructor(metadataProvider: MetadataPort, eventsProvider: EventPort) {
    super(metadataProvider, eventsProvider);
  }

  // Listener for mousemove - now just a method that will be used by getEventHandlers
  private handleMouseMove = (payload: EventPayloads["mousemove"]) => {
    this.mouseMoves.push(payload);
  };

  // No need to override startListening and stopListening since we're using the base class implementations

  // Process events loaded from storage
  processEvents(events: StoredEvent[]): void {
    // Filter for mousemove events and add to our collection
    const mouseMoveEvents = events
      .filter(
        (event): event is StoredEvent<"mousemove"> => event.type === "mousemove"
      )
      .map((event) => event.data);

    if (mouseMoveEvents.length > 0) {
      this.mouseMoves = mouseMoveEvents;
    }
  }

  // Provide event handlers to the manager
  getEventHandlers(): EventHandler<EventType>[] {
    return [
      {
        eventType: "mousemove",
        handler: this.handleMouseMove,
      },
    ] as EventHandler<EventType>[];
  }

  getDefaultFeatures(): MouseEventFeatures {
    return {
      avgSpeed: -1,
      stdSpeed: -1,
      idleCount: -1,
      mouseMoveCount: 0,
    };
  }

  extractFeatures(): FeatureResult<MouseEventFeatures> {
    if (this.mouseMoves.length < MIN_MOVE_EVENTS) {
      return { features: this.getDefaultFeatures(), hasData: false };
    }

    const speeds: number[] = [];
    let idleCount = 0;
    const currentMoves = [...this.mouseMoves];
    let lastTimestamp = currentMoves[0].timestamp;

    for (let i = 1; i < currentMoves.length; i++) {
      const prev = currentMoves[i - 1];
      const curr = currentMoves[i];
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
      const dist = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );

      if (timeDiff > 0) {
        const speed = dist / timeDiff;
        speeds.push(speed);
      }

      if (curr.timestamp - lastTimestamp > IDLE_THRESHOLD_MS) {
        idleCount++;
      }
      if (dist > 0 || timeDiff < IDLE_THRESHOLD_MS / 1000) {
        lastTimestamp = curr.timestamp;
      }
    }

    if (speeds.length === 0) {
      return {
        features: {
          ...this.getDefaultFeatures(),
          mouseMoveCount: currentMoves.length,
        },
        hasData: false,
      };
    }

    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const stdSpeed = speeds.length > 1 ? standardDeviation(speeds) : 0;

    const features: MouseEventFeatures = {
      avgSpeed: isNaN(avgSpeed) ? -1 : avgSpeed,
      stdSpeed: isNaN(stdSpeed) ? -1 : stdSpeed,
      idleCount,
      mouseMoveCount: currentMoves.length,
    };

    return {
      features,
      hasData: true,
    };
  }
}
