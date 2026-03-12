from groq import Groq
import os

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def get_ken_response(user_input):
    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are KenAI, a helpful and witty personal assistant."},
            {"role": "user", "content": user_input},
        ],
        model="llama3-8b-8192", # Fast for "live" feel
    )
    return chat_completion.choices[0].message.content