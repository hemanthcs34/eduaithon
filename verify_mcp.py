
import requests
import json

BASE_URL = "http://localhost:8001"
API_KEY = "mcp_dev_secret_key_change_in_production"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def verify_scale():
    print("Verifying POST /api/scale (Scaling)...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/scale",
            headers=HEADERS,
            json={"replicas": 5}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ POST /api/scale SUCCESS")
            print(f"   Response status: {response.json().get('status', 'N/A')}")
            print(f"   Response replicas: {response.json().get('replicas', 'N/A')}")
        else:
            print("❌ POST /api/scale FAILED")
            
    except Exception as e:
        print(f"❌ Error during POST /api/scale: {e}")

def verify_head_scale():
    print("\nVerifying HEAD /api/scale (Health Check)...")
    try:
        # requests.head sends a HEAD request
        response = requests.head(
            f"{BASE_URL}/api/scale",
            headers=HEADERS
        )
        print(f"Status Code: {response.status_code}")
        # HEAD requests don't have body, but status code 200/204 is good.
        # 405 means Method Not Allowed (which was the issue).
        
        if response.status_code in [200, 204]:
            print("✅ HEAD /api/scale SUCCESS (Method Allowed)")
        else:
            print(f"❌ HEAD /api/scale FAILED with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error during HEAD /api/scale: {e}")

def verify_get_scale():
    print("\nVerifying GET /api/scale (Status Check)...")
    try:
        response = requests.get(
            f"{BASE_URL}/api/scale",
            headers=HEADERS
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ GET /api/scale SUCCESS")
            print(f"   Current replicas: {response.json().get('replicas', 'N/A')}")
        else:
            print(f"❌ GET /api/scale FAILED with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error during GET /api/scale: {e}")

if __name__ == "__main__":
    verify_scale()
    verify_get_scale()
    verify_head_scale()
