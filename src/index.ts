import { AgentDetector, DEFAULT_EXTRACTORS } from "./agent-detector";
import { BrowserEnvironment } from "./environments/browser/environment";
import { DetectionResult } from "./types/detection-types";

const env = new BrowserEnvironment();

const agentDetector = new AgentDetector(env.metadata, env.events);

env.start();

// Attach to window for global access
if (typeof window !== "undefined") {
  (window as any).AgentDetector = AgentDetector;

  (window as any).agentDetector = agentDetector;
}

export { agentDetector, AgentDetector, DEFAULT_EXTRACTORS, DetectionResult };
export default agentDetector;
