import requests
import json

TOKEN = "EAAZAVAy1umqcBQQBcfv5c9iqOdD93aZCBO8gyA3q9odtbdbFMMevWI5avjFljZCxq3HtnS7qWkkGzgn8o9BHqZCEhmY7jKqbJkTNmQlZBfRg0byUraW8HZAM4tQmdJajDhq0dkGjR5BklBna9imLBNkymIxdu1NZC5yxnhKt1YBvG7CectOOMLNMw9PQtqEVzvOIZCAHodxXPZAZBsKHEjYNscN5heGjN007ulqB5VS0ND0jLrKIZAuoeBdgV1ZAtiGrD28kiHSnZBwZCUD3TFMh8ZBsZBhFZBOSZCjaWgQzFElK64xiXnYPwCKwZDZD"
APP_ID = "1782321995750055"
APP_SECRET = "f2e945de7d1ef2bfb2ce85699aead868"

 
"""

url = "https://graph.facebook.com/debug_token"
params = {
    "input_token": INPUT_TOKEN,
    "access_token": f"{APP_ID}|{APP_SECRET}"
}

resp = requests.get(url, params=params)
resp.raise_for_status()

print(json.dumps(resp.json(), indent=2))


"""
resp = requests.get(
    "https://graph.facebook.com/v19.0/me",
    headers={"Authorization": f"Bearer {TOKEN}"}
)

print(resp.status_code)
print(resp.json())


resp = requests.get(
    "https://graph.facebook.com/v19.0/me/adaccounts",
    headers={"Authorization": f"Bearer {TOKEN}"},
    params={"fields": "id,name,account_status"}
)

print(resp.json())

