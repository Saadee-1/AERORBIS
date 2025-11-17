# Step-by-Step: Adding Your Aerobot API Key

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Log in to your account
3. Select your AeroVerse project (or create one if you don't have it)

### Step 2: Navigate to Edge Functions
You have **two ways** to get there:

**Option A:**
- Click on **"Project Settings"** (gear icon) in the left sidebar
- Click on **"Edge Functions"** in the settings menu
- Scroll down to **"Secrets"** section

**Option B:**
- Click on **"Edge Functions"** in the left sidebar
- Click on **"Manage secrets"** or look for a **"Secrets"** tab/button

### Step 3: Add Your API Key
1. Click **"Add new secret"** or **"New secret"** button
2. In the **"Name"** field, type exactly: `AEROBOT_API_KEY`
   - ⚠️ Must be exactly this (case-sensitive)
3. In the **"Value"** field, paste your API key
4. Click **"Save"** or **"Add secret"**

### Step 4: Verify It's Added
- You should see `AEROBOT_API_KEY` in your secrets list
- The value will be hidden (showing as dots or asterisks) - this is normal and secure

### Step 5: Test It
1. Go back to your app
2. Open the Aerobot chat
3. Send a test message like "Hello"
4. If it works, you'll get a response!
5. If you see an error, check the browser console (F12) for details

---

## Method 2: Using Supabase CLI (Advanced)

If you prefer using the command line:

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set the secret
supabase secrets set AEROBOT_API_KEY=your_api_key_here
```

---

## Troubleshooting

### ❌ "AEROBOT_API_KEY is not configured" error
**Solutions:**
- Double-check the secret name is exactly `AEROBOT_API_KEY` (no typos, correct case)
- Wait 2-3 minutes after adding - secrets take a moment to propagate
- Try redeploying your Edge Function
- Check you're in the correct Supabase project

### ❌ "Rate limit exceeded"
- Your API key might have usage limits
- Check your API provider's dashboard for usage/quota

### ❌ "Unauthorized" or "Invalid API key"
- Verify your API key is correct (no extra spaces)
- Make sure the key hasn't expired
- Check if your API provider requires additional setup

### ❌ Can't find "Secrets" section
- Make sure you're looking at Edge Functions settings
- Some Supabase projects might need Edge Functions enabled first
- Try refreshing the page

---

## Quick Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Selected correct project
- [ ] Found Edge Functions → Secrets
- [ ] Added secret named: `AEROBOT_API_KEY`
- [ ] Pasted API key in value field
- [ ] Saved the secret
- [ ] Waited 2-3 minutes
- [ ] Tested in the app

---

## Need Help?

If you get stuck at any step:
1. Tell me which step you're on
2. Share the error message (if any) - **but NOT your API key**
3. I'll help you troubleshoot!

