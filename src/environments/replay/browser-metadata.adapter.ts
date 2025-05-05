import { MetadataPort } from "../../ports";
import { BrowserMetadata } from "../../types/browser-metadata";
import { ReplaySnapshot } from "./snapshot";

/**
 * Adapter that implements the MetadataPort interface for replay environments.
 * Provides access to pre-recorded browser metadata from a captured user session.
 */
export class ReplayMetadataAdapter implements MetadataPort {
  /**
   * Creates a new replay metadata adapter.
   *
   * @param snapshot Snapshot containing the pre-recorded browser metadata
   */
  constructor(private snapshot: ReplaySnapshot) {}

  /**
   * Retrieves the pre-recorded browser metadata from the replay snapshot.
   *
   * @returns Promise resolving to the recorded browser metadata
   */
  async getMetadata(): Promise<BrowserMetadata> {
    return Promise.resolve(this.snapshot.metadata);
  }
}
