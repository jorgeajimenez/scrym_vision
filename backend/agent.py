import logging
import random
import time
from typing import Any, Dict

from dotenv import load_dotenv
from utils import Debouncer
from vision_agents.core import Agent, Runner, User
from vision_agents.plugins import getstream, openai, roboflow

logger = logging.getLogger(__name__)

load_dotenv()

class FootballCommentator(Agent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.last_analysis_time = 0
        self.debouncer = Debouncer(8)
        self.questions = [
            "What should the offensive team do next?",
            "What should the defensive team do next?",
        ]

    async def on_detection_completed(self, event: roboflow.DetectionCompletedEvent):
        """
        Trigger an action when Roboflow detected objects on the video.
        """
        detections = event.objects
        
        # Construct Scrimmage Update for Frontend
        tactical_persons = []
        for i, det in enumerate(detections):
            # Mock mapping from detection coordinates to top-down field
            # Assuming standard HD (1920x1080) for normalization if raw coords are not normalized
            raw_x = det.get("x", 0)
            raw_y = det.get("y", 0)
            
            # Simple heuristic normalization (assuming raw_x > 1 implies pixel coords)
            if raw_x > 1:
                norm_x = raw_x / 1920
                norm_y = raw_y / 1080
            else:
                norm_x = raw_x
                norm_y = raw_y
            
            # Map to 533x300 top-down field
            top_down_x = norm_x * 533
            top_down_y = norm_y * 300
            
            # Mock team assignment based on position
            team = "offense" if norm_x < 0.5 else "defense"
            
            tactical_persons.append({
                "person_id": f"p-{i}",
                "top_down_x": top_down_x,
                "top_down_y": top_down_y,
                "role": det.get("class", "PLAYER"),
                "team": team
            })

        prediction = random.choice(["Pass", "Run"])
        payload = {
            "type": "scrimmage_update",
            "data": {
                "tactical_persons": tactical_persons,
                "analysis": {
                    "ideal_defensive_coords": [],
                    "prediction": prediction,
                    "tactical_note": f"Detected {len(detections)} players. Formation suggests {prediction}."
                }
            }
        }
        
        # Send event to frontend
        await self.send_custom_event(payload)

        # Voice Commentary Logic
        ball_detected = bool(
            [obj for obj in detections if obj["class"] == "sports ball" or obj["label"] == "sports ball"]
        )
        
        if ball_detected and self.debouncer:
            await self.simple_response(random.choice(self.questions))


async def create_agent(**kwargs) -> Agent:
    llm = openai.Realtime()

    # User ID must match what App.tsx expects ('scrym_agent' or similar)
    # App.tsx: const participant = participants?.find(p => p.userId === 'scrym_agent');
    agent_user = User(name="AI Sports Commentator", id="scrym_agent")

    agent = FootballCommentator(
        edge=getstream.Edge(),
        agent_user=agent_user,
        instructions="Read @instructions.md",
        processors=[
            roboflow.RoboflowLocalDetectionProcessor(
                model_id="rfdetr-base",
                fps=5,
                conf_threshold=0.5,
                classes=["person", "sports ball"],
            )
        ],
        llm=llm,
    )

    # Subscribe the custom handler
    agent.events.subscribe(agent.on_detection_completed)
    
    return agent


if __name__ == "__main__":
    # Hardcoded run configuration for 'superbowl_lx_live'
    async def main():
        agent = await create_agent()
        # Create/Join the specific call
        call = await agent.create_call("default", "superbowl_lx_live")
        async with agent.join(call):
            await agent.finish()

    import asyncio
    asyncio.run(main())
