/**
 * Supported event types that can be captured during user session recording.
 */
export type EventType =
  | "click"
  | "scroll"
  | "keydown"
  | "keyup"
  | "mousemove"
  | "mousedown"
  | "mouseup"
  | "focus"
  | "blur"
  | "visibilitychange"
  | "popstate"
  | "beforeunload";

/**
 * Base type for all event payloads - includes timestamp
 */
export interface BaseEventPayload {
  timestamp: number;
}

/**
 * Maps each event type to its corresponding payload structure.
 * Defines the specific data captured for each event type.
 */
export type EventPayloads = {
  click: BaseEventPayload & {
    type: "click";
    x: number;
    y: number;
    button: number;
  };
  scroll: BaseEventPayload & {
    type: "scroll";
    scrollX: number;
    scrollY: number;
  };
  keydown: BaseEventPayload & {
    type: "keydown";
    key: string;
    keyCode: string | number;
    modifiers: {
      alt: boolean;
      ctrl: boolean;
      shift: boolean;
      meta: boolean;
    };
  };
  keyup: BaseEventPayload & {
    type: "keyup";
    key: string;
    keyCode: string | number;
    modifiers: {
      alt: boolean;
      ctrl: boolean;
      shift: boolean;
      meta: boolean;
    };
  };
  mousemove: BaseEventPayload & {
    type: "mousemove";
    x: number;
    y: number;
    button: number;
  };
  mousedown: BaseEventPayload & {
    type: "mousedown";
    x: number;
    y: number;
    button: number;
  };
  mouseup: BaseEventPayload & {
    type: "mouseup";
    x: number;
    y: number;
    button: number;
  };
  focus: BaseEventPayload & { type: "focus" };
  blur: BaseEventPayload & { type: "blur" };
  visibilitychange: BaseEventPayload & {
    type: "visibilitychange";
    state: DocumentVisibilityState;
  };
  popstate: BaseEventPayload & { type: "popstate"; url: string };
  beforeunload: BaseEventPayload & { type: "beforeunload"; url: string };
};

/**
 * Represents a captured user event with timing and context information.
 * @template T - The specific event type from EventType
 */
export type ReplayEvent<T extends EventType> = {
  type: T;
  href: string;
  timestamp: number;
  data: EventPayloads[T];
};

/**
 * Collection of replay events recorded during a user session.
 */
export type ReplayEvents = ReplayEvent<keyof EventPayloads>[];
