import { BrowserMetadata } from "../../types/browser-metadata";
import { ReplayEvents } from "../../types/events";

/**
 * Complete record of a user session including browser metadata and captured events.
 * Used for replaying user interactions for evaluation and testing.
 *
 * This interface provides a standardized structure for session data storage and retrieval,
 * enabling accurate reproduction of user sessions for detection algorithm development and evaluation.
 */
export interface ReplaySnapshot {
  /**
   * Browser and device metadata captured at the start of the session
   */
  metadata: BrowserMetadata;

  /**
   * Chronological sequence of user interaction events during the session
   */
  events: ReplayEvents;
}
