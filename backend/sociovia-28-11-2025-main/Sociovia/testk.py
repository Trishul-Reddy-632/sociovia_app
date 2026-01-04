from google.oauth2 import service_account
from google.auth.transport.requests import Request

SERVICE_ACCOUNT_FILE = "Sociovia/angular-sorter-473216-k8-835a67a5574c.json"

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Load credentials directly from JSON file
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=SCOPES
)

# 🔍 This line validates the JWT signature
credentials.refresh(Request())

print(" JWT SIGNATURE IS VALID — SERVICE ACCOUNT AUTH WORKS")
