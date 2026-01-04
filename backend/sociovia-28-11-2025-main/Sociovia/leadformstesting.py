import requests

API_VERSION = "v21.0"
SYSTEM_USER_TOKEN = "EAAZAVAy1umqcBQQBcfv5c9iqOdD93aZCBO8gyA3q9odtbdbFMMevWI5avjFljZCxq3HtnS7qWkkGzgn8o9BHqZCEhmY7jKqbJkTNmQlZBfRg0byUraW8HZAM4tQmdJajDhq0dkGjR5BklBna9imLBNkymIxdu1NZC5yxnhKt1YBvG7CectOOMLNMw9PQtqEVzvOIZCAHodxXPZAZBsKHEjYNscN5heGjN007ulqB5VS0ND0jLrKIZAuoeBdgV1ZAtiGrD28kiHSnZBwZCUD3TFMh8ZBsZBhFZBOSZCjaWgQzFElK64xiXnYPwCKwZDZD"
"""
def get_pages(system_token):
    url = f"https://graph.facebook.com/{API_VERSION}/me/accounts"
    params = {
        "fields": "id,name,category,access_token",
        "access_token": system_token
    }
    r = requests.get(url, params=params).json()
    return r.get("data", [])

def get_lead_forms(page_id, page_token):
    url = f"https://graph.facebook.com/{API_VERSION}/{page_id}/leadgen_forms"
    params = {
        "fields": "id,name,status,created_time",
        "access_token": page_token
    }
    r = requests.get(url, params=params).json()
    return r.get("data", [])

def main():
    pages = get_pages(SYSTEM_USER_TOKEN)

    if not pages:
        print(" No pages found for this system user")
        return

    for page in pages:
        print(f"\n Page: {page['name']} ({page['id']})")

        page_token = page.get("access_token")
        if not page_token:
            print("   No page access token")
            continue

        forms = get_lead_forms(page["id"], page_token)

        if not forms:
            print("   No lead forms found")
            continue

        for f in forms:
            print(f"   Form: {f['name']} | ID: {f['id']} | Status: {f['status']}")


import requests

API_VERSION = "v21.0"
PAGE_ID = "101704182550721"
PAGE_TOKEN = "PAGE_ACCESS_TOKEN"

payload = {
    "name": "Test Lead Form API",
    "questions": [{"type": "EMAIL"}],
    "privacy_policy": {
        "url": "https://example.com/privacy",
        "link_text": "Privacy Policy"
    }
}

url = f"https://graph.facebook.com/{API_VERSION}/{PAGE_ID}/leadgen_forms"

r = requests.post(
    url,
    params={"access_token": SYSTEM_USER_TOKEN},
    json=payload
).json()

print(r)
"""

import requests

API_VERSION = "v21.0"
PAGE_ID = "101704182550721"


r = requests.get(
    f"https://graph.facebook.com/{API_VERSION}/{PAGE_ID}",
    params={
        "fields": "access_token",
        "access_token": SYSTEM_USER_TOKEN
    }
).json()

page_token = r.get("access_token")
print(r)
