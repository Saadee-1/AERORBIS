# Where to Add Your Aerobot API Key

## Current Setup

Your app uses **Supabase Edge Functions** to call the AI API. This means you need to add your API key in **Supabase**, not in a local `.env` file.

## Step-by-Step Instructions

### Option 1: Supabase Edge Functions (Recommended - Current Setup)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions Settings**
   - Go to: **Project Settings** → **Edge Functions**
   - Or: **Settings** → **API** → **Edge Functions**

3. **Add Environment Variables**
   - Click on **"Secrets"** or **"Environment Variables"**
   - Add the following secrets:

   ```
   AEROBOT_API_KEY = your_api_key_here
   ```

4. **Optional: Custom API Configuration**
   If you want to use a different API endpoint or model:
   ```
   AEROBOT_API_URL = https://api.openai.com/v1/chat/completions
   AEROBOT_MODEL = gpt-4o-mini
   ```

5. **Redeploy Edge Functions** (if needed)
   - After adding secrets, you may need to redeploy the `ai-chat` function
   - Or wait a few minutes for changes to take effect

### Option 2: Direct Client-Side API (Alternative)

If you want to call the API directly from the frontend (bypassing Supabase):

1. **Create a `.env` file** in the root directory of your project:
   ```
   VITE_AEROBOT_API_KEY=your_api_key_here
   VITE_AEROBOT_API_URL=https://api.openai.com/v1/chat/completions
   VITE_AEROBOT_MODEL=gpt-4o-mini
   ```

2. **Note**: This requires modifying the code to use `src/lib/aerobot-api.ts` directly instead of going through Supabase.

## Which Option Should You Use?

- **Use Option 1 (Supabase)** if:
  - You're already using Supabase
  - You want to keep API keys secure on the server
  - You want to use the existing setup

- **Use Option 2 (Client-side)** if:
  - You don't have Supabase configured
  - You want to call the API directly
  - You're okay with the API key being in the frontend code

## Testing

After adding your API key:

1. Open the Aerobot chat in your app
2. Send a test message
3. Check the browser console for any errors
4. If you see "AEROBOT_API_KEY is not configured", the key wasn't set correctly

## Troubleshooting

**Error: "AEROBOT_API_KEY is not configured"**
- Make sure you added the secret in Supabase Edge Functions
- Check that the secret name is exactly `AEROBOT_API_KEY` (case-sensitive)
- Try redeploying the Edge Function

**Error: "Rate limit exceeded"**
- Your API key might have usage limits
- Check your API provider's dashboard

**Error: "Failed to connect"**
- Check your internet connection
- Verify the API URL is correct
- Make sure the API key is valid

## Security Note

⚠️ **Never commit your API key to Git!**
- If using `.env`, make sure `.env` is in `.gitignore`
- Supabase secrets are automatically secure and not exposed to the frontend

