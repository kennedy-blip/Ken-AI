import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="KenAI Production API")

# Configure CORS for your deployment
# Replace "*" with your actual Netlify/Vercel URL for better security later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Compact memory for speed
chat_history = [
    {
        "role": "system", 
        "content": "You are KenAI. Be concise, witty, and fast. Keep replies under 25 words."
    }
]

class ChatRequest(BaseModel):
    text: str

@app.get("/")
async def health_check():
    return {"status": "active", "model": "llama-3.1-8b-instant"}

@app.post("/ask")
async def ask_ken(request: ChatRequest):
    global chat_history
    try:
        user_input = request.text.strip()
        chat_history.append({"role": "user", "content": user_input})

        # Keep only system prompt + last 4 exchanges
        if len(chat_history) > 6:
            chat_history = [chat_history[0]] + chat_history[-5:]

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=chat_history,
            temperature=0.6,
            max_tokens=60,
        )

        reply = completion.choices[0].message.content
        chat_history.append({"role": "assistant", "content": reply})

        return {"reply": reply}
    except Exception as e:
        print(f"Error: {e}")
        return {"reply": "I'm experiencing a slight delay. Try again?"}

if __name__ == "__main__":
    import uvicorn
    # Render requires binding to 0.0.0.0 and using the PORT env variable
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)