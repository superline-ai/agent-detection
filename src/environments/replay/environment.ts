import * as fs from "fs";
import * as path from "path";
import * as tar from "tar-stream";
import * as zlib from "zlib";
import { Environment, MetadataPort } from "../../ports";
import { IEventStorage, MockEventStorage } from "../../storage";
import { BrowserMetadata } from "../../types/browser-metadata";
import { ReplayEvent, ReplayEvents } from "../../types/events";
import { ReplayMetadataAdapter } from "./browser-metadata.adapter";
import { ReplayEventAdapter } from "./event.adapter";
import { ReplaySnapshot } from "./snapshot";

/**
 * Environment implementation for replaying recorded user sessions.
 * Provides access to recorded metadata and events for simulation and evaluation.
 * Used primarily for testing and agent detection evaluation using pre-recorded sessions.
 */
export class ReplayEnvironment implements Environment {
  readonly metadata: MetadataPort;
  readonly events: ReplayEventAdapter;
  readonly eventStorage: IEventStorage;

  /**
   * Creates a new replay environment from a session snapshot.
   *
   * @param snapshot Object containing recorded metadata and events
   * @param sessionId Unique identifier for the replay session
   */
  constructor(
    snapshot: { metadata: BrowserMetadata; events: ReplayEvents },
    sessionId: string
  ) {
    this.metadata = new ReplayMetadataAdapter(snapshot);
    this.events = new ReplayEventAdapter(snapshot.events);
    this.eventStorage = new MockEventStorage(sessionId);
  }

  /**
   * Starts replaying the recorded events through the event adapter.
   * Events will be processed by any registered handlers.
   */
  async start() {
    // Detector already wired up against .events
    // Now pump the events through:
    await this.events.start(/* realTime = */ false);
  }
}

/**
 * Load a session archive (tar.gz or zip) and return a fully-prepared ReplayEnvironment.
 * @param archivePath Path to the session archive (e.g. "session-abc123.tar.gz" or ".zip").
 * @returns Promise resolving to a configured ReplayEnvironment
 */
export async function loadSessionEnvironment(
  archivePath: string
): Promise<ReplayEnvironment> {
  const ext = path.extname(archivePath).toLowerCase();
  let snapshot: ReplaySnapshot;

  if (ext === ".zip") {
    throw new Error("Zip archives are not supported yet");
  } else if (ext === ".gz" || ext === ".tgz") {
    snapshot = await loadFromTarGz(archivePath);
  } else {
    throw new Error(`Unsupported archive format: ${ext}`);
  }

  // Use the filename (without extension) as the session ID
  const sessionId = path.basename(archivePath, path.extname(archivePath));
  return new ReplayEnvironment(snapshot, sessionId);
}

/**
 * Extracts and parses session data from a tar.gz archive.
 *
 * @param gzPath Path to the tar.gz archive containing session data
 * @returns Promise resolving to a ReplaySnapshot with metadata and events
 */
function loadFromTarGz(gzPath: string): Promise<ReplaySnapshot> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const events: ReplayEvents = [];
    let metadata: BrowserMetadata | null = null;

    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (c) => chunks.push(c));
      stream.on("end", () => {
        const content = Buffer.concat(chunks).toString("utf-8");
        if (header.name.includes("metadata.json")) {
          metadata = JSON.parse(content) as BrowserMetadata;
        } else if (header.name.includes("events.ndjson")) {
          content.split(/\r?\n/).forEach((l) => {
            if (l.trim()) {
              try {
                const json = JSON.parse(l);
                const event = json.type;
                events.push(json as ReplayEvent<typeof event>);
              } catch (e) {
                console.warn(`Failed to parse JSON line: ${l}`);
                // Continue to next line
              }
            }
          });
        }
        next();
      });
      stream.resume();
    });

    extract.on("finish", () => {
      if (!metadata) {
        reject(new Error("metadata.json not found in archive"));
      } else {
        resolve({ metadata, events });
      }
    });

    fs.createReadStream(gzPath)
      .pipe(zlib.createGunzip())
      .pipe(extract)
      .on("error", reject);
  });
}
