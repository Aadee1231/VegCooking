modal deploy modal_app.py

Testing:
```
curl -X POST "https://flavur--vegcooking-backend-fastapi-app.modal.run/download-video-test" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=-sHzwq4T1LU"}'
```