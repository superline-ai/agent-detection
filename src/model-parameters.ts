import { ModelParameters } from "./types/detection-types";

export const MODEL_PARAMETERS: ModelParameters = {
  weights: {
    max_touch_points: -0.5143956069595789,
    device_pixel_ratio: -0.2863739691885242,
    media_devices: -0.08616739104082564,
    plugins: -0.49735439185648017,
    keyboard_typing_consistency: -0.1138474768087763,
    has_webgl_swiftshader: 0.0,
    has_active_mouse_movement: 0.13971990273315532,
    has_scroll_events: 0.19480381603147318,
  },
  bias: 0.19480381603147318,
  feature_order: [
    "max_touch_points",
    "device_pixel_ratio",
    "media_devices",
    "plugins",
    "keyboard_typing_consistency",
    "has_webgl_swiftshader",
    "has_active_mouse_movement",
    "has_scroll_events",
  ],
  preprocessing: {
    numeric_features: {
      max_touch_points: {
        mean: 0.38461538461538464,
        std: 1.3323467750529823,
      },
      device_pixel_ratio: {
        mean: 1.6000000009169946,
        std: 0.6421118990024256,
      },
      hardware_concurrency: {
        mean: 11.615384615384615,
        std: 4.3947251867956,
      },
      device_memory: {
        mean: 6.6923076923076925,
        std: 2.6423944672796416,
      },
      media_devices: {
        mean: 1.5384615384615385,
        std: 1.447299055555906,
      },
      plugins: {
        mean: 3.076923076923077,
        std: 2.4325212770525995,
      },
      keyboard_typing_consistency: {
        mean: 17.525329670796335,
        std: 22.662629369110885,
      },
    },
    categorical_features: {},
    boolean_features: [
      "touch_support",
      "has_webgl_swiftshader",
      "has_active_scrolling",
      "has_mouse_events",
      "has_active_mouse_movement",
      "has_scroll_events",
      "has_click_events",
      "has_typing_events",
    ],
  },
};
