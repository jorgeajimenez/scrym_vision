# Vision Agents: Football Commentator API Extension

This document describes the modifications made to the Football Commentator example to enable external system integration and real-time data delivery, as well as the rationale behind using the Vision Agents framework.

### Why Build with Vision Agents?
We chose Vision Agents primarily for its robust **Object Detection** capabilities. In a high-speed sports environment like football, generic vision models often struggle to track specific entities reliably. Vision Agents allowed us to easily integrate specialized models (like `RoboflowLocalDetectionProcessor`) to accurately identify players and the ball in real-time. This precision is the foundation of any meaningful automated commentary; without accurate detection, the AI has no context to describe the play.

### How Vision Agents Shaped the Solution
The framework's architecture directly enabled a **Real-Time and Responsive** system.
*   **Event-Driven Architecture:** By treating visual detections as events (`DetectionCompletedEvent`), we could decouple the heavy lifting of video processing from the commentary logic. This meant the system only reacted when meaningful action occurred (e.g., "ball detected"), preventing AI hallucination during downtime.
*   **Low-Latency Integration:** The seamless integration with `getstream.Edge` meant we didn't have to build a video pipeline from scratch. We could focus entirely on the "brain" of the commentator while the framework handled the complex, low-latency video transport required for live sports.

### Advice for Developers
Based on our experience building this extension, we recommend:
1.  **Trust the Event Loop:** Don't try to poll for state. Rely on the rich event system (`on_agent_speech`, `on_detection_completed`) to trigger your application logic. It makes for cleaner, more reactive code.
2.  **Hybrid Intelligence is Key:** Don't rely solely on one large model. The combination of a specialized, fast object detector (like Roboflow) triggers the slower, more creative Large Language Model (OpenAI Realtime) only when necessary. This pattern—"fast eye, slow brain"—is crucial for responsive real-time applications.
3.  **Expose the Internal State:** As demonstrated by this API extension, the internal state of the agent (like commentary history and video session URLs) is incredibly valuable to external systems. Don't trap it inside the agent; expose it via simple APIs to build rich, multi-platform experiences around your core vision logic.

---

### Technical Implementation Details

The standard example was extended into a service-oriented architecture to allow third-party applications to consume both the video feed and the AI-generated commentary dynamically.

*   **Integrated API Server:** Embedded an `aiohttp` web server into the agent's runtime, exposing real-time endpoints on port `5050`.
*   **Asynchronous Event Capture:** Implemented a subscription to `RealtimeAgentSpeechTranscriptionEvent`. This allows the system to capture streaming AI commentary and maintain a chronological history (LIFO) for external consumption.
*   **Dynamic URL Interception:** Monkeypatched the `agent.edge.open_demo` method to programmatically capture the session-specific GetStream join URL, making it available via API rather than just opening a local browser.
*   **Broadcast Configuration:** Configured the `getstream.Edge` with `channel_type="livestream"` to ensure the permission model supports public viewing and embedding.
*   **Permissive CORS Middleware:** Implemented an "open-access" CORS policy to facilitate seamless integration with any web-based frontend or external dashboard.

### API Endpoints for Live Integration

The system provides three primary endpoints to facilitate live feeds:

1.  **`GET /feed`**: Returns the absolute URL for the GetStream hosted video player. This enables instant embedding via `<iframe>` for low-latency visual monitoring.
2.  **`GET /commentary`**: Delivers a JSON array of the most recent play-by-play descriptions and timestamps, allowing external UIs to display a live scrolling ticker of the match events.
3.  **`GET /credentials`**: Provides the raw `apiKey`, `callId`, and a pre-authorized viewer `token`. This allows developers to build custom viewing experiences using the Stream Video SDKs (React, Flutter, iOS, Android) while connecting to the same live session as the AI Agent.

### How to Run
```bash
uv run football_commentator_api.py run --video-track-override ScrimmageVideo.mp4
```
Once initialized, the live feed and data become available at `http://localhost:5050/`.
