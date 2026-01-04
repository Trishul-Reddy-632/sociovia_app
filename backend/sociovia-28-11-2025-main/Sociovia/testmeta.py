import requests
import hmac
import hashlib
import sys

API_VERSION = "v19.0"
GRAPH = f"https://graph.facebook.com/{API_VERSION}"
CLIENT_BUSINESS_ID = "3080195185582455"  # from your logs

APP_ID = "1782321995750055"
APP_SECRET = "f2e945de7d1ef2bfb2ce85699aead868"

BASE_ACCESS_TOKEN = "EAAZAVAy1umqcBQHLMXm8VxYxBYzFFioY53rn85a4efBurK3g4ZCvbQEpmwh5CTi6ZAnmdpdflP559iaZAaZCiQZCzPwCZALp8mXEuDKYHV5OAREG5wzIRs2Ng25zZCw82toZAvuv4tTGZBHZAcWGa9zyIVOc0BmnyVZAaIrNpOZAvjxKM0pGlbt7G6qnDgwZBTpJgtxr98476TIYznp0ho3r8NQZAqmxOHBtJalw2Xue7ovVjpF7tFyN1d2jMNvTElLezYSzf8ANYTOZCGVDqUwkfua3kCK2uNjapbXMAxWwG5I8shDaUvGqgAZDZD"


def appsecret_proof(token: str) -> str:
    return hmac.new(
        APP_SECRET.encode(),
        token.encode(),
        hashlib.sha256
    ).hexdigest()


# --------------------------------------------------
# STEP 1: DEBUG TOKEN
# --------------------------------------------------
def debug_token():
    url = f"{GRAPH}/debug_token"
    params = {
        "input_token": BASE_ACCESS_TOKEN,
        "access_token": f"{APP_ID}|{APP_SECRET}"
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()["data"]


# --------------------------------------------------
# STEP 2: VERIFY BUSINESS LINKAGE
# --------------------------------------------------
def get_client_business_id():
    url = f"{GRAPH}/me"
    params = {
        "fields": "client_business_id",
        "access_token": BASE_ACCESS_TOKEN,
        "appsecret_proof": appsecret_proof(BASE_ACCESS_TOKEN)
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()


# --------------------------------------------------
# STEP 3: FETCH SYSTEM USERS
# --------------------------------------------------
def get_system_users():
    url = f"{GRAPH}/{CLIENT_BUSINESS_ID}/system_users"
    params = {
        "access_token": BASE_ACCESS_TOKEN,
        "appsecret_proof": appsecret_proof(BASE_ACCESS_TOKEN)
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json().get("data", [])


# --------------------------------------------------
# STEP 4: FETCH EXISTING SYSTEM USER TOKEN
# --------------------------------------------------
def get_system_user_access_token(system_user_id: str):
    url = f"{GRAPH}/{CLIENT_BUSINESS_ID}/system_user_access_tokens"
    params = {
        "access_token": BASE_ACCESS_TOKEN,
        "appsecret_proof": appsecret_proof(BASE_ACCESS_TOKEN),
        "system_user_id": system_user_id,
        "fetch_only": "true"
    }
    r = requests.post(url, params=params)
    r.raise_for_status()
    return r.json()["access_token"]


# --------------------------------------------------
# MAIN
# --------------------------------------------------
if __name__ == "__main__":

    print(" Debugging token...")
    token_info = debug_token()
    print(token_info)

    if "business_management" not in token_info.get("scopes", []):
        sys.exit(" Missing business_management permission")

    print("Checking business linkage...")
    me = get_client_business_id()
    print(me)

    if me.get("client_business_id") != CLIENT_BUSINESS_ID:
        sys.exit(" Token not linked to expected client business")

    print(" Fetching system users...")
    system_users = get_system_users()

    if not system_users:
        sys.exit(
            " No system users found. "
            "Client must create & assign a System User in Business Manager."
        )

    system_user_id = system_users[0]["id"]
    print("System User ID:", system_user_id)

    print(" Fetching system user token (fetch_only)...")
    token = get_system_user_access_token(system_user_id)
    print(" SYSTEM USER ACCESS TOKEN:\n", token)
