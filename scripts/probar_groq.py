import os 
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

cliente=Groq(api_key=os.environ["GROQ_API_KEY"])

respuesta=cliente.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[{"role": "user", "content": "Di 'hola' y nada más."}],
)

print(respuesta.choices[0].message.content)