import {
  EventHandler,
  FeatureExtractor,
  FeatureResult,
} from "../feature-extractor";
import { EventPort, MetadataPort } from "../ports";
import { StoredEvent } from "../storage";
import { EventType } from "../types/events";

/**
 * Defines the structure for features extracted from browser metadata.
 */
export interface BrowserMetadataFeatures {
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  screenAvailWidth: number;
  screenAvailHeight: number;
  screenColorDepth: number;
  plugins: number;
  deviceMemory: number;
  hardwareConcurrency: number;
  touchSupport: boolean;
  maxTouchPoints: number;
  platform: string;
  doNotTrack: string | null;
  webdriver: boolean;
  cookieEnabled: boolean;
  timezoneOffset: number;
  timeZone: string;
  mediaDevices: number;
  hasWebglSwiftshader: boolean;
}

export class BrowserMetadataExtractor extends FeatureExtractor<BrowserMetadataFeatures> {
  constructor(metadataProvider: MetadataPort, eventsProvider: EventPort) {
    super(metadataProvider, eventsProvider);
  }

  // Metadata extractor doesn't need events
  processEvents(events: StoredEvent[]): void {
    // No events to process for metadata extractor
  }

  // Metadata extractor doesn't need any event handlers
  getEventHandlers(): EventHandler<EventType>[] {
    return [];
  }

  // This remains async as it fetches metadata
  async extractFeatures(): Promise<FeatureResult<BrowserMetadataFeatures>> {
    try {
      const metadata = await this.metadataProvider.getMetadata();
      const features: BrowserMetadataFeatures = {
        devicePixelRatio:
          metadata.devicePixelRatio ??
          this.getDefaultFeatures().devicePixelRatio,
        screenWidth:
          metadata.screenResolution?.width ??
          this.getDefaultFeatures().screenWidth,
        screenHeight:
          metadata.screenResolution?.height ??
          this.getDefaultFeatures().screenHeight,
        screenAvailWidth:
          metadata.screenAvailResolution?.width ??
          this.getDefaultFeatures().screenAvailWidth,
        screenAvailHeight:
          metadata.screenAvailResolution?.height ??
          this.getDefaultFeatures().screenAvailHeight,
        screenColorDepth:
          metadata.colorDepth ?? this.getDefaultFeatures().screenColorDepth,
        plugins: metadata.plugins?.length ?? this.getDefaultFeatures().plugins,
        deviceMemory:
          metadata.deviceMemory ?? this.getDefaultFeatures().deviceMemory,
        hardwareConcurrency:
          metadata.hardwareConcurrency ??
          this.getDefaultFeatures().hardwareConcurrency,
        touchSupport:
          metadata.touchSupport ?? this.getDefaultFeatures().touchSupport,
        maxTouchPoints:
          metadata.maxTouchPoints ?? this.getDefaultFeatures().maxTouchPoints,
        mediaDevices:
          metadata.mediaDevicesCount ?? this.getDefaultFeatures().mediaDevices,
        platform: metadata.platform ?? this.getDefaultFeatures().platform,
        doNotTrack: metadata.doNotTrack ?? this.getDefaultFeatures().doNotTrack,
        webdriver: metadata.webdriver ?? this.getDefaultFeatures().webdriver,
        cookieEnabled:
          metadata.cookieEnabled ?? this.getDefaultFeatures().cookieEnabled,
        timezoneOffset:
          metadata.timezoneOffset ?? this.getDefaultFeatures().timezoneOffset,
        timeZone: metadata.timeZone ?? this.getDefaultFeatures().timeZone,
        hasWebglSwiftshader:
          metadata.webglInfo?.webglRenderer?.includes("SwiftShader") ??
          this.getDefaultFeatures().hasWebglSwiftshader,
      };

      return {
        features,
        hasData: true,
      };
    } catch (error) {
      console.error("Error fetching browser metadata:", error);
      return {
        features: this.getDefaultFeatures(),
        hasData: false,
      };
    }
  }

  getDefaultFeatures(): BrowserMetadataFeatures {
    return {
      devicePixelRatio: -1,
      screenWidth: -1,
      screenHeight: -1,
      screenAvailWidth: -1,
      screenAvailHeight: -1,
      screenColorDepth: -1,
      plugins: 0,
      deviceMemory: -1,
      hardwareConcurrency: -1,
      touchSupport: false,
      maxTouchPoints: 0,
      platform: "unknown",
      doNotTrack: "unspecified",
      webdriver: false,
      cookieEnabled: false,
      timezoneOffset: -999,
      timeZone: "unknown",
      mediaDevices: 0,
      hasWebglSwiftshader: false,
    };
  }
}
