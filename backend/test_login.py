import requests
import json

url = "http://localhost:8000/api/auth/login"
payload = {
  "email": "pawantheblizz@gmail.com",
  "password": "Pranjay2026"
}
headers = {
  "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload)
    print(response.status_code)
    print(response.json())
except Exception as e:
    print("Error:", e)
