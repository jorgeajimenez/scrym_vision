import logging
import random
import asyncio
import json
import time
import os
import datetime
from urllib.parse import urlencode
from aiohttp import web

from dotenv import load_dotenv
from utils import Debouncer
from vision_agents.core import Agent, Runner, User
from vision_agents.core.agents import AgentLauncher
from vision_agents.core.llm.events import RealtimeAgentSpeechTranscriptionEvent
from vision_agents.plugins import getstream, openai, roboflow
from getstream.models import ChannelInput, ChannelMemberRequest, ChannelMember

logger = logging.getLogger(__name__)

load_dotenv()

# Global state
commentary_history = []
current_feed_url = ""
connection_details = {}

async def handle_commentary(request):
    return web.json_response(commentary_history)

async def handle_feed(request):
    return web.json_response({"url": current_feed_url})

async def handle_credentials(request):
    if not connection_details:
        return web.json_response({"error": "Call not started yet"}, status=404)
    return web.json_response(connection_details)

@web.middleware
async def permissive_cors_middleware(request, handler):
    """The most permissive CORS middleware possible."""
    if request.method == "OPTIONS":
        response = web.Response(status=200)
    else:
        try:
            response = await handler(request)
        except Exception as e:
            logger.error(f"Handler error: {e}", exc_info=True)
            response = web.json_response({"error": str(e)}, status=500)
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = '*'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Access-Control-Expose-Headers'] = '*'
    response.headers['Access-Control-Max-Age'] = '86400'
    return response

async def start_api_server():
    app = web.Application(middlewares=[permissive_cors_middleware])
    app.add_routes([
        web.get('/commentary', handle_commentary),
        web.get('/feed', handle_feed),
        web.get('/credentials', handle_credentials)
    ])
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 5050)
    await site.start()
    logger.info("🚀 API Server online: /commentary, /feed, /credentials")
    return runner

async def create_agent(**kwargs) -> Agent:
    # Voice options: alloy, ash, ballad, coral, echo, sage, shimmer, verse
    # 'ash' is chosen for a more assertive, sports-like tone.
    voice = os.getenv("OPENAI_VOICE", "ash")
    llm = openai.Realtime(voice=voice)

    instructions = (
        "You are an AI American Football commentator. "
        "You will be shown a video of parts of a football match. "
        "When asked what is going on right now, describe what you can see and the events that are taking place. "
        "Focus on the play, the formation, the movement of the ball and players. "
        "Keep the replies very short, a few words max. "
        "Reply in English without using special symbols. The main goal is for someone listening to plot the positions of the players on the a field. Don't say things like sure or lead ins, just give the information. DON'T claim there was a touchdown if there wasn't?"
    )

    agent = Agent(
        edge=getstream.Edge(channel_type="livestream"),
        agent_user=User(name="AI Sports Commentator", id="agent"),
        instructions=instructions,
        processors=[
            roboflow.RoboflowLocalDetectionProcessor(
                classes=["person", "sports ball"],
                conf_threshold=0.5,
                fps=5,
            )
        ],
        llm=llm,
    )

    # Monkeypatch to capture the exact URL being opened
    original_open_demo = agent.edge.open_demo
    async def wrapped_open_demo(call):
        url = await original_open_demo(call)
        global current_feed_url
        current_feed_url = url
        logger.info(f"Captured Feed URL: {url}")
        return url
    agent.edge.open_demo = wrapped_open_demo

    questions = ["Describe the both teams formations right before the ball snapped?"]
    debouncer = Debouncer(8)

    @agent.events.subscribe
    async def on_agent_speech(event: RealtimeAgentSpeechTranscriptionEvent):
        global commentary_history
        text = getattr(event, "text", getattr(event, "transcript", None))
        if text:
            commentary_history.insert(0, {"text": text, "timestamp": time.time()})
            if len(commentary_history) > 50: commentary_history.pop()

    @agent.events.subscribe
    async def on_detection_completed(event: roboflow.DetectionCompletedEvent):
        ball_detected = bool([obj for obj in event.objects if obj["label"] == "sports ball"])
        if ball_detected and debouncer:
            await agent.simple_response(random.choice(questions))

    return agent

async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    await start_api_server()
    call = await agent.create_call(call_type, call_id)

    # Prepare credentials for the SDK/index.html
    global connection_details
    client = agent.edge.client
    viewer_id = "public-viewer"
    try:
        token = client.create_token(viewer_id, expiration=3600)
        connection_details = {
            "apiKey": client.api_key,
            "token": token,
            "callId": call_id,
            "callType": call_type,
            "userId": viewer_id
        }
        try: await client.upsert_users([{"id": viewer_id, "name": "Viewer"}])
        except: pass
    except Exception as e:
        logger.error(f"Cred error: {e}")

    try:
        async with agent.join(call):
            await agent.finish()
    finally:
        pass

if __name__ == "__main__":
    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()
