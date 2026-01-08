"""
List available Groq models
"""
import asyncio
import httpx
from app.core.config import settings

async def list_models():
    api_key = settings.GROQ_API_KEY
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Available Groq models:")
            for model in data.get("data", []):
                model_id = model.get("id", "")
                # Only show vision-related models
                if "vision" in model_id.lower() or "llava" in model_id.lower() or "scout" in model_id.lower() or "maverick" in model_id.lower():
                    print(f"  - {model_id}")
            print("\nAll models containing 'llama':")
            for model in data.get("data", []):
                model_id = model.get("id", "")
                if "llama" in model_id.lower():
                    print(f"  - {model_id}")
        else:
            print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    asyncio.run(list_models())
