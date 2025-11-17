# Aerobot API Setup Verification

## ✅ You've Added the API Key to Supabase

Great! Here's what you need to verify:

## Required Environment Variables in Supabase

Make sure you've added these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

1. **`AEROBOT_API_KEY`** (Required)
   - Your OpenAI API key
   - Format: `sk-...`

2. **`AEROBOT_API_URL`** (Optional - defaults to OpenAI)
   - Default: `https://api.openai.com/v1/chat/completions`
   - Only change if using a different API provider

3. **`AEROBOT_MODEL`** (Optional - defaults to gpt-4o-mini)
   - Default: `gpt-4o-mini`
   - Other options: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`, etc.

## How It Works

```
Your Browser
  ↓
Supabase Edge Function (/functions/v1/ai-chat)
  ↓ (uses AEROBOT_API_KEY from Supabase secrets)
OpenAI API (or your configured API)
  ↓
Response back to Aerobot
```

## Testing Your Setup

1. **Open Aerobot** in your app
2. **Send a test message** like "Hello, can you help me?"
3. **Check for errors**:
   - If you see "AEROBOT_API_KEY is not configured" → The key isn't set correctly
   - If you see "Rate limit exceeded" → API key works but has usage limits
   - If you get a response → ✅ Everything is working!

## Common Issues

### Issue: "AEROBOT_API_KEY is not configured"
**Solution:**
- Go to Supabase Dashboard → Edge Functions → Secrets
- Make sure the secret name is exactly `AEROBOT_API_KEY` (case-sensitive)
- Redeploy the Edge Function or wait a few minutes

### Issue: "Failed to fetch" or Network Error
**Solution:**
- Check that `VITE_SUPABASE_URL` is set in your local `.env` file
- Verify your Supabase project is active
- Check browser console for specific error messages

### Issue: API Key Invalid
**Solution:**
- Verify your OpenAI API key is correct
- Check that the key starts with `sk-`
- Ensure the key has sufficient credits/quota

## Current Configuration

- **API Provider**: OpenAI (default)
- **Model**: gpt-4o-mini (default)
- **Endpoint**: https://api.openai.com/v1/chat/completions
- **Response Style**: Concise, crisp, 2-4 sentences
- **Modes**: Chat (1000 tokens) and Summarize (500 tokens)

## Next Steps

1. ✅ API key added to Supabase
2. ⏳ Test Aerobot in your app
3. ⏳ Verify responses are working
4. ⏳ Check that calculation context is being passed correctly

If everything is working, Aerobot should now:
- Respond to your messages
- Understand calculation context from tools
- Provide concise, helpful aerospace engineering insights
- Support multiple languages
- Save chat history

