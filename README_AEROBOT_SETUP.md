# Aerobot API Setup Guide

## Quick Start

1. **Create a `.env` file** in the root directory:
```env
VITE_AEROBOT_API_KEY=your_api_key_here
```

2. **Optional Configuration**:
```env
# Custom API URL (defaults to OpenAI API)
VITE_AEROBOT_API_URL=https://api.openai.com/v1/chat/completions

# Model name (defaults to gpt-4o-mini)
VITE_AEROBOT_MODEL=gpt-4o-mini
```

3. **For Supabase Edge Functions** (if using):
Set these environment variables in your Supabase project:
- `AEROBOT_API_KEY` - Your API key
- `AEROBOT_API_URL` - (Optional) API endpoint URL
- `AEROBOT_MODEL` - (Optional) Model name

## Features

✅ **Chat History** - All chats are automatically saved and persist across sessions
✅ **Delete Chat** - Delete individual chat sessions from history
✅ **New Chat** - Start a fresh conversation while preserving history
✅ **Chat Mode** - Normal conversational mode with concise responses
✅ **Summarize Mode** - Summarize text with ultra-concise outputs (2-3 sentences)
✅ **Concise Responses** - All responses are crisp, to-the-point, and actionable

## Response Style

Aerobot is configured to provide:
- **Brief answers** (2-4 sentences for most questions)
- **Bullet points** for lists
- **Direct and practical** responses
- **No unnecessary verbosity**

## API Integration

The system supports:
- OpenAI API (default)
- Any OpenAI-compatible API endpoint
- Custom models via configuration

## Chat History

- Automatically saved to localStorage
- Persists across browser sessions
- Up to 20 recent chats stored
- Each chat shows title, timestamp, and message count
- Quick access buttons for recent chats

