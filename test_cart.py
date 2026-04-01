import requests
import json
import logging

# Get token
print("Logging in...")
login_res = requests.post("http://localhost:8001/api/v1/auth/login", data={
    "username": "7061483898",
    "password": "password" # Wait, OTP auth doesn't use password. What was the login method?
})

print(login_res.status_code, login_res.text)
