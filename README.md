# Superline Agent Detection

![NPM Version](https://img.shields.io/npm/v/%40superline-ai%2Fagent-detection)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A lightweight, high-performance library for detecting AI agents in real-time from browser sessions based on browser environment metadata and behavioral patterns.

> **Note:** This is an early version of the library and is not yet recommended for production use.

## Overview

Superline Agent Detection analyzes a session on a website in real-time to distinguish between human users and AI agents. The library extracts features from browser metadata and behavioral data (mouse movements, keyboard patterns, scroll behavior, clicks) and processes them through a logistic regression model to calculate detection probability.

Built on data from hundreds of thousands of labeled browser sessions, the detection system is continuously improved with new findings and for better reliability. The library is designed to have minimal performance impact while providing reliable detection results.

Detection results can be used to differentiate between humans and agents in your analytics and A/B testing setups, ensuring your metrics reflect actual human behavior and your experiments target the right audience.

## Documentation

For comprehensive documentation, API references, and integration guides, visit our official documentation:

[docs.superline.ai](https://docs.superline.ai)

## Installation

### NPM, Yarn, or PNPM

```bash
npm install @superline-ai/agent-detection
# or
yarn add @superline-ai/agent-detection
# or
pnpm add @superline-ai/agent-detection
```

### Script Tag

Add directly to your HTML head:

```html
<!-- Add the script with defer attribute -->
<script src="https://cdn.jsdelivr.net/npm/@superline-ai/agent-detection/dist/index.min.js" defer></script>

<!-- Initialize it with defer as well -->
<script defer>
  document.addEventListener('DOMContentLoaded', function() {
    // The library exposes a global agentDetector object
    window.agentDetector.init({
      debug: false,
      autoStart: true
    });
    
    // Later, check if the session is from an agent
    window.agentDetector.finalizeDetection()
      .then(result => {
        console.log('Is agent:', result.isAgent, 'Score:', result.score);
      });
  });
</script>
```

## Quick Start

Getting started with Superline Agent Detection is simple:

```javascript
import agentDetector from '@superline-ai/agent-detection';

// Initialize the detector (pre-instantiated)
agentDetector.init({
  debug: false,
  autoStart: true
});

// Later, when you want to check if the session is from an agent
const result = await agentDetector.finalizeDetection();
console.log('Is agent:', result.isAgent, 'Score:', result.score);

// Integration with analytics
// Send the agent detection result to your analytics platform
if (result.isAgent) {
  // Example with Google Analytics 4
  gtag('set', 'user_properties', {
    is_agent: true,
    agent_score: result.score
  });
  
  // Example with Mixpanel
  mixpanel.people.set({
    'Is Agent': true,
    'Agent Score': result.score
  });
}
```

That's it! The library will begin collecting behavioral patterns and provide detection results.

## Roadmap

Currently, the library is "open weights" - providing the trained model weights for detection. We're actively working on several improvements to make the agent detection more powerful and versatile:

- More sophisticated feature extraction and benchmarks for reliable detection
- Releasing the complete end-to-end stack including:
  - Data collection library for gathering browser sessions
  - Feature exploration tools and analytics
  - Training pipeline (Python ML codebase)
  - Detection system
- End-to-end system for custom training and detection

## Community & Support

Join our Discord community to connect with other developers, ask questions, and share your experiences:

[Join the Superline Discord](https://discord.gg/superline)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

## Changelog

For a detailed changelog and release history, please refer to our [GitHub Releases page](https://github.com/superline-ai/agent-detection/releases). 