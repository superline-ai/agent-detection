import { EventPort } from "../../ports";
import { EventPayloads, EventType } from "../../types/events";

// Omit timestamp from the event transformer return type
type EventPayloadWithoutTimestamp<K extends EventType> = Omit<
  EventPayloads[K],
  "timestamp"
>;
type EventTransformer<K extends EventType> = (
  e: Event,
) => EventPayloadWithoutTimestamp<K>;

/**
 * Adapter that implements the EventPort interface for browser environments.
 * Handles DOM event listening and transforms browser events into standardized event payloads.
 * Provides a consistent interface for registering and unregistering event handlers across different event types.
 */
export class BrowserEventAdapter implements EventPort {
  private readonly eventSourceMap: {
    [K in EventType]: "window" | "document";
  } = {
    click: "document",
    scroll: "window",
    keydown: "document",
    keyup: "document",
    mousemove: "document",
    mousedown: "document",
    mouseup: "document",
    focus: "document",
    blur: "document",
    visibilitychange: "document",
    popstate: "window",
    beforeunload: "window",
  };

  private readonly eventTransformers: {
    [K in EventType]: EventTransformer<K>;
  } = {
    click: (e: Event) => {
      const mouseEvent = e as MouseEvent;
      return {
        type: "click",
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        button: mouseEvent.button,
      };
    },
    mousemove: (e: Event) => {
      const mouseEvent = e as MouseEvent;
      return {
        type: "mousemove",
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        button: mouseEvent.button,
      };
    },
    scroll: () => {
      return {
        type: "scroll",
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      };
    },
    keydown: (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      return {
        type: "keydown",
        key: keyEvent.key,
        keyCode: keyEvent.keyCode ?? keyEvent.code,
        modifiers: {
          alt: keyEvent.altKey,
          ctrl: keyEvent.ctrlKey,
          shift: keyEvent.shiftKey,
          meta: keyEvent.metaKey,
        },
      };
    },
    keyup: (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      return {
        type: "keyup",
        key: keyEvent.key,
        keyCode: keyEvent.keyCode ?? keyEvent.code,
        modifiers: {
          alt: keyEvent.altKey,
          ctrl: keyEvent.ctrlKey,
          shift: keyEvent.shiftKey,
          meta: keyEvent.metaKey,
        },
      };
    },
    mousedown: (e: Event) => {
      const mouseEvent = e as MouseEvent;
      return {
        type: "mousedown",
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        button: mouseEvent.button,
      };
    },
    mouseup: (e: Event) => {
      const mouseEvent = e as MouseEvent;
      return {
        type: "mouseup",
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        button: mouseEvent.button,
      };
    },
    focus: () => {
      return {
        type: "focus",
      }; // Default values for focus event
    },
    blur: () => {
      return {
        type: "blur",
      }; // Default values for blur event
    },
    visibilitychange: () => {
      return {
        type: "visibilitychange",
        state: document.visibilityState,
      }; // Default values for visibilitychange
    },
    popstate: () => {
      return {
        type: "popstate",
        url: window.location.href,
      }; // Default values for popstate
    },
    beforeunload: () => {
      return {
        type: "beforeunload",
        url: window.location.href,
      }; // Default values for beforeunload
    },
  };

  // Store the mapping between our payload handlers and the actual DOM event handlers
  private readonly handlerMap = new Map<Function, EventListener>();

  constructor() {}

  /**
   * Registers an event handler for the specified event type.
   * Automatically transforms browser events into standardized payloads before invoking the handler.
   *
   * @param evt The event type to listen for
   * @param handler The callback function to be called when the event occurs
   */
  on<K extends EventType>(
    evt: K,
    handler: (payload: EventPayloads[K]) => void,
  ): void {
    const transformer = this.eventTransformers[evt];
    const source = this.eventSourceMap[evt];

    // Create the DOM event listener that transforms the event and calls the handler
    const domEventListener = ((e: Event) => {
      const timestamp = e.timeStamp || Date.now();
      const basePayload = transformer(e);
      // Include timestamp in the payload
      const payload = { ...basePayload, timestamp } as EventPayloads[K];
      handler(payload);
    }) as EventListener;

    // Store the mapping for later use in off()
    this.handlerMap.set(handler, domEventListener);

    const target = source === "window" ? window : document;
    target.addEventListener(evt, domEventListener);
  }

  /**
   * Unregisters an event handler for the specified event type.
   *
   * @param evt The event type to stop listening for
   * @param handler The callback function to be removed
   */
  off<K extends EventType>(
    evt: K,
    handler: (payload: EventPayloads[K]) => void,
  ): void {
    // Get the corresponding DOM event listener
    const domEventListener = this.handlerMap.get(handler);
    const source = this.eventSourceMap[evt];

    if (domEventListener) {
      const target = source === "window" ? window : document;
      target.removeEventListener(evt, domEventListener);
      this.handlerMap.delete(handler);
    }
  }
}
