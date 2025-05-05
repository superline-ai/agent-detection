import { MetadataPort } from "../../ports";
import { BrowserMetadata } from "../../types/browser-metadata";

/**
 * Adapter that implements the MetadataPort interface for browser environments.
 * Collects and provides browser-specific metadata such as user agent, screen dimensions,
 * hardware details, WebGL information, and various browser capabilities.
 */
export class BrowserMetadataAdapter implements MetadataPort {
  /**
   * Retrieves comprehensive browser metadata including hardware information,
   * screen properties, browser capabilities, and environment details.
   *
   * @returns Promise resolving to browser metadata
   */
  async getMetadata(): Promise<BrowserMetadata> {
    return this.collectMetadata();
  }

  /**
   * Retrieves WebGL-related information from the browser.
   * Attempts to create a WebGL context and extract vendor and renderer information.
   *
   * @returns Object containing WebGL vendor, renderer, and extension count
   */
  private getWebGLInfo(): {
    webglVendor?: string;
    webglRenderer?: string;
    webglExtensions?: number;
  } {
    try {
      const canvas = document.createElement("canvas");

      // Get the first context that succeeds (WebGL2 → WebGL1 → experimental)
      const gl =
        (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
        (canvas.getContext("webgl") as WebGLRenderingContext | null) ??
        (canvas.getContext(
          "experimental-webgl"
        ) as WebGLRenderingContext | null);

      if (!gl) return {}; // WebGL disabled

      // At this point `gl` is definitely a rendering‑context,
      // so assert `any` to silence any lingering TS lib‑mismatch warnings.
      const debugExt = (gl as any).getExtension("WEBGL_debug_renderer_info");
      const vendor = debugExt
        ? (gl as any).getParameter(debugExt.UNMASKED_VENDOR_WEBGL)
        : undefined;
      const renderer = debugExt
        ? (gl as any).getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
        : undefined;

      const extCount = ((gl as any).getSupportedExtensions() ?? []).length;

      return {
        webglVendor: vendor,
        webglRenderer: renderer,
        webglExtensions: extCount,
      };
    } catch {
      return {};
    }
  }

  /**
   * Collects all available browser metadata into a standardized format.
   * Gathers information about the browser, hardware, network, screen,
   * permissions, and capabilities.
   *
   * @returns Complete browser metadata object
   */
  private async collectMetadata(): Promise<BrowserMetadata> {
    const plugins = Array.from(navigator.plugins || []).map((p) => p.name);

    // ── Navigator‑level
    const uaData = (navigator as any).userAgentData;
    const connection = (navigator as any).connection || {};
    const orientation = (screen.orientation || {}) as ScreenOrientation;

    // ── Slow probes (need await)
    const permissionNotification = await navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((p) => p.state)
      .catch(() => "unknown");

    const mediaDevicesCount = await navigator.mediaDevices
      .enumerateDevices()
      .then((d) => d.length)
      .catch(() => undefined);

    const audioSampleRate = (() => {
      try {
        return new (window.AudioContext || (window as any).webkitAudioContext)()
          .sampleRate;
      } catch {
        return undefined;
      }
    })();

    // ── WebGL
    const webglInfo = this.getWebGLInfo();

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: Array.from(navigator.languages),
      screenResolution: { width: screen.width, height: screen.height },
      windowSize: { width: window.innerWidth, height: window.innerHeight },
      timezoneOffset: new Date().getTimezoneOffset(),
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      colorDepth: screen.colorDepth,
      plugins,
      platform: navigator.platform,
      touchSupport: "ontouchstart" in window,
      timestamp: Date.now(),
      href: window.location.href,
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
      webdriver: !!navigator.webdriver,
      doNotTrack: navigator.doNotTrack ?? null,
      cookieEnabled: navigator.cookieEnabled,
      userAgentData: uaData
        ? {
            brands: uaData.brands,
            mobile: uaData.mobile,
            platform: uaData.platform,
          }
        : undefined,
      connection: {
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
        downlink: connection.downlink,
      },
      screenAvailResolution: {
        width: screen.availWidth,
        height: screen.availHeight,
      },
      outerWindowSize: {
        width: window.outerWidth,
        height: window.outerHeight,
      },
      orientation: {
        type: orientation.type,
        angle: orientation.angle,
      },
      webglInfo,
      audioSampleRate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      permissionNotification,
      mediaDevicesCount,
    };
  }
}
