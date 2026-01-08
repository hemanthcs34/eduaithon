"""
Test Groq Llama 4 Scout vision with proper format
"""
import asyncio
import httpx
from app.core.config import settings

async def test_groq():
    api_key = settings.GROQ_API_KEY
    
    print(f"API Key: {api_key[:15]}...")
    
    # Test image - 1x1 red pixel
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    
    # Try the format from Groq docs for Llama 4
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Describe this image in one word."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{test_image_base64}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 100
            }
        )
        
        print(f"\nStatus: {response.status_code}")
        import json
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Response: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_groq())
