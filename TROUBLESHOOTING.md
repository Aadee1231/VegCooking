# Auto-Magic Planner Troubleshooting Guide

## Network Request Failed Error

If you're getting a "network request failed" error when clicking "Plan My Week", follow these steps:

## 1. Check Backend Server

### Is the backend running?
```bash
cd backend
python -m app.main
```

You should see:
```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Test backend directly
Open browser and go to: http://localhost:8000/health
You should see: `{"ok": true}`

## 2. Check Environment Variables

### Frontend (.env file)
```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (environment or .env)
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

## 3. Debug with Console Logs

Open your app's developer console and look for:
- 🔗 Calling API: [URL]
- 📤 Request data: [request details]
- 📥 Response status: [HTTP status]
- ❌ Error response: [error details]

## 4. Common Issues & Solutions

### Issue: "Network request failed"
**Cause**: Backend not running or wrong URL
**Solution**: 
1. Start backend server
2. Check EXPO_PUBLIC_API_URL environment variable
3. Verify port 8000 is available

### Issue: "Planning service unavailable (404)"
**Cause**: API endpoint not found
**Solution**: 
1. Check if `/smart-meal-plan` endpoint exists in backend
2. Restart backend after code changes

### Issue: "Planning service unavailable (500)"
**Cause**: Backend error (database, OpenAI, etc.)
**Solution**: 
1. Check backend console logs
2. Verify Supabase connection
3. Check OpenAI API key

## 5. Quick Test Script

Run the test script to isolate the issue:
```bash
python test_auto_planner.py
```

## 6. Alternative: Mock Mode

If you want to test the UI without backend, temporarily modify the code:

```typescript
// In handleAutoPlanWeek function, add this at the beginning:
if (true) { // Force mock mode for testing
  toast("Mock: Auto-planned 21 meals for your week! 🎉");
  setIsAutoPlanning(false);
  return;
}
```

## 7. Check Network Configuration

### Windows Firewall
- Make sure port 8000 is not blocked
- Allow Python/Node.js through firewall

### Antivirus Software
- Some antivirus apps block localhost connections
- Add exception for your development folder

## 8. Port Conflicts

If port 8000 is in use:
```bash
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID [PID] /F
```

Or change the port in backend:
```python
# In backend/app/main.py, change:
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(cookApp, host="0.0.0.0", port=8001)  # Changed to 8001
```

And update frontend:
```bash
EXPO_PUBLIC_API_URL=http://localhost:8001
```

## 9. Database Connection Issues

Check if Supabase is accessible:
```bash
# Test with curl (replace with your values)
curl -X POST "https://your-project.supabase.co/rest/v1/recipes" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

## 10. Next Steps

1. **Check console logs** - Look for the 🔗, 📤, 📥, ❌ emojis
2. **Verify backend** - Ensure it's running and accessible
3. **Test API directly** - Use the Python test script
4. **Check environment** - Verify all required variables are set
5. **Try mock mode** - Test UI without backend dependencies

If you're still stuck, please share:
- The exact error message
- Console log output
- Backend server status
- Environment variable values (without secrets)
