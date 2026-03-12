import pyttsx3

class KenVoiceEngine:
    def __init__(self):
        # Initialize the TTS engine
        self.engine = pyttsx3.init('sapi5')
        
        # Configure Voice Properties
        self.engine.setProperty('rate', 175)    # Speed: 200 is default, 175 is more natural
        self.engine.setProperty('volume', 1.0) # Volume: 0.0 to 1.0
        
        # Get available voices and set to a preferred one
        # voices[0] is usually Male (David), voices[1] is Female (Zira)
        voices = self.engine.getProperty('voices')
        self.engine.setProperty('voice', voices[1].id) 

    def speak(self, text):
        """Converts text to speech and plays it."""
        print(f"KenAI: {text}")
        self.engine.say(text)
        self.engine.runAndWait()

# Initialize a single instance to be used across the app
engine = KenVoiceEngine()

if __name__ == "__main__":
    # Quick test to make sure it's working
    engine.speak("Hello Kennedy, Ken-A-I voice engine is online.")