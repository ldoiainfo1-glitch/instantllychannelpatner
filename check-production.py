#!/usr/bin/env python3
import requests
import json

print("🔍 Checking production backend for Deepak's photo...\n")

try:
    # Fetch positions from production
    url = "https://instantllychannelpatner.onrender.com/api/positions?country=India"
    print(f"Fetching: {url}\n")
    
    response = requests.get(url, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Error: HTTP {response.status_code}")
        print(response.text[:500])
        exit(1)
    
    positions = response.json()
    print(f"✅ Received {len(positions)} positions\n")
    
    # Find Deepak's position
    deepak = None
    for p in positions:
        if p.get('applicantDetails', {}).get('phone') == '9768676666':
            deepak = p
            break
    
    if not deepak:
        print("❌ Deepak's position not found")
        exit(1)
    
    print("📝 Found Deepak's position:")
    print(f"   Name: {deepak['applicantDetails']['name']}")
    print(f"   Phone: {deepak['applicantDetails']['phone']}")
    print(f"   Status: {deepak.get('status', 'N/A')}")
    
    photo = deepak['applicantDetails'].get('photo', '')
    photo_length = len(photo)
    
    print(f"\n📸 Photo Analysis:")
    print(f"   Length: {photo_length:,} characters")
    
    if photo_length > 10000:
        print(f"   ✅ NEW PHOTO (Updated JPEG)")
        print(f"   Photo preview: {photo[:50]}...")
    elif photo_length == 698:
        print(f"   ❌ OLD PHOTO (SVG placeholder)")
        print(f"   Photo preview: {photo[:50]}...")
    else:
        print(f"   ⚠️  Unknown photo length")
    
    print(f"\n📊 Expected values:")
    print(f"   Old photo: 698 characters")
    print(f"   New photo: ~60,499 characters")
    
    if photo_length < 10000:
        print(f"\n❌ PROBLEM: Backend is still returning old photo")
        print(f"   This means the fix hasn't been deployed to production yet.")
        print(f"   Backend needs to redeploy with commit 1bb5a62 or later.")
    else:
        print(f"\n✅ SUCCESS: Backend is returning updated photo!")

except requests.exceptions.Timeout:
    print("❌ Timeout: Backend is taking too long to respond")
    print("   It might be cold starting. Wait 30 seconds and try again.")
except requests.exceptions.RequestException as e:
    print(f"❌ Network error: {e}")
except json.JSONDecodeError as e:
    print(f"❌ JSON parse error: {e}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
