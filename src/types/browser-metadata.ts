/**
 * Represents comprehensive information about the user's browser environment.
 * Captured during the initialization of the agent detection system.
 */
export interface BrowserMetadata {
  userAgent: string;
  language: string;
  languages: string[];
  screenResolution: {
    width: number;
    height: number;
  };
  windowSize: {
    width: number;
    height: number;
  };
  timezoneOffset: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  devicePixelRatio: number;
  colorDepth: number;
  plugins: string[];
  platform: string;
  touchSupport: boolean;
  timestamp: number;
  href: string;
  maxTouchPoints: number;
  webdriver: boolean;
  doNotTrack: string | null;
  cookieEnabled: boolean;
  userAgentData:
    | {
        brands: string[];
        mobile: boolean;
        platform: string;
      }
    | undefined;
  connection: {
    effectiveType: string;
    rtt: number;
    downlink: number;
  };
  screenAvailResolution: {
    width: number;
    height: number;
  };
  outerWindowSize: {
    width: number;
    height: number;
  };
  orientation: {
    type: string;
    angle: number;
  };
  webglInfo: {
    webglVendor?: string;
    webglRenderer?: string;
    webglExtensions?: number;
  };
  audioSampleRate: number | undefined;
  timeZone: string;
  permissionNotification: string;
  mediaDevicesCount: number | undefined;
}
