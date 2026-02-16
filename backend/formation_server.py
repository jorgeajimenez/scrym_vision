import os
import json
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommentaryRequest(BaseModel):
    text: str

class Player(BaseModel):
    id: str
    x: float
    y: float
    position: str
    team: str

class FormationResponse(BaseModel):
    players: List[Player]

# Configure Gemini
# Expects GOOGLE_API_KEY in environment
if "GOOGLE_API_KEY" in os.environ:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

@app.post("/formation", response_model=FormationResponse)
async def get_formation(request: CommentaryRequest):
    if "GOOGLE_API_KEY" not in os.environ:
        # Mock fallback if no key (for testing/demo without key)
        print("No GOOGLE_API_KEY found. Returning mock.")
        return {
            "players": [] 
        }

    model = genai.GenerativeModel('gemini-2.0-flash')
    
    prompt = f"""
    You are a football formation expert. 
    Map the following commentary description to a JSON object containing a list of 22 players (11 offense, 11 defense) with coordinates for a 2D football field.
    
    Field Dimensions: Width 2400, Height 1060.
    Line of Scrimmage (LOS): X = 1200.
    Center of Field Y = 530.
    
    Offense is LEFT of LOS (X < 1200). Defense is RIGHT of LOS (X > 1200).
    
    Commentary: "{request.text}"
    
    Return ONLY valid JSON matching this schema:
    {{
        "players": [
            {{ "id": "o1", "x": 1150, "y": 530, "position": "QB", "team": "offense" }},
            ...
        ]
    }}
    
    Ensure logical positioning based on the formation described (e.g., Shotgun, I-Formation, Nickel, Dime).
    """
    
    try:
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5051)
