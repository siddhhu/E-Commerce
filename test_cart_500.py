import requests

url = 'http://localhost:8001/api/v1/cart/items'
headers = {
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OTczM2NkNi1kMTAwLTRlNzctODBiMC0zMjY0YjhjZDEyNWEiLCJlbWFpbCI6InBob25lXys5MTcwNjE0ODM4OThfNTllZWM2MzJAcHJhbmpheS5jb20iLCJleHAiOjE3NzUwNzM5MTAsInR5cGUiOiJhY2Nlc3MifQ.6_lAy9ed2DV26E2yYs-qjvTp0DVPtzZiF3zICDqxtQ4',
    'origin': 'https://www.pranjay.com',
    'content-type': 'application/json'
}
data = {"product_id": "5ee98080-7686-4e94-9dc6-37cd7bd99cdd", "quantity": 1}

print("Sending request to local backend...")
try:
    res = requests.post(url, headers=headers, json=data)
    print(res.status_code)
    print(res.text)
except Exception as e:
    print(e)
