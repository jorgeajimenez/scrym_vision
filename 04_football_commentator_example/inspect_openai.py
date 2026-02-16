from vision_agents.plugins import openai
import inspect

print("Help on openai.Realtime:")
print(inspect.signature(openai.Realtime))
print(openai.Realtime.__doc__)
