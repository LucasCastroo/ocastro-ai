import os
import speech_recognition as sr
from gtts import gTTS
from pydub import AudioSegment
import tempfile
import base64
from datetime import date
from app.utils.enums import TaskStatus

class VoiceService:
    @staticmethod
    def _transcribe_audio(audio_file_path):
        recognizer = sr.Recognizer()
        
        # Convert to WAV if necessary (SpeechRecognition prefers WAV)
        # Using pydub to handle conversion
        try:
            # Load audio (pydub handles many formats if ffmpeg is installed)
            audio = AudioSegment.from_file(audio_file_path)
            
            # Export to specific WAV format for SpeechRecognition
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                audio.export(temp_wav.name, format="wav")
                wav_path = temp_wav.name
                
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
                try:
                    # Using Google's free speech recognition
                    text = recognizer.recognize_google(audio_data, language="pt-BR")
                    return text
                except sr.UnknownValueError:
                    return None
                except sr.RequestError:
                    return None
            
            # Cleanup temp wav
            try:
                os.remove(wav_path)
            except:
                pass
                
        except Exception as e:
            print(f"Error processing audio: {e}")
            return None

    @staticmethod
    def _generate_audio_response(text):
        try:
            tts = gTTS(text=text, lang='pt', slow=False)
            
            # Save to temp file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_mp3:
                tts.save(temp_mp3.name)
                temp_path = temp_mp3.name
            
            # Read and encode to base64
            with open(temp_path, "rb") as audio_file:
                audio_bytes = audio_file.read()
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                
            try:
                os.remove(temp_path)
            except:
                pass
                
            return audio_base64
        except Exception as e:
            print(f"Error generating audio response: {e}")
            return None

    @staticmethod
    def process_text_command(text, user_id):
        text = text.lower()
        response_text = ""
        intent = "unknown"
        data = None

        # --- Intent Logic (Simulated AI) ---
        if "nova tarefa" in text or "criar tarefa" in text or "adicionar tarefa" in text:
            intent = "create_task"
            response_text = "Entendido. Vou criar uma nova tarefa. Qual o título?"
        
        elif "hoje" in text and ("tarefas" in text or "tenho" in text or "agenda" in text):
            intent = "list_today_tasks"
            response_text = "Estou buscando suas tarefas para hoje."
            data = {"date": str(date.today())}

        elif "concluída" in text or "feita" in text or "terminar" in text:
            intent = "update_task_status"
            response_text = "Certo. Qual tarefa você quer marcar como concluída?"
            data = {"target_status": TaskStatus.CONCLUIDA}
            
        elif "fazendo" in text or "iniciar" in text or "começar" in text:
            intent = "update_task_status"
            response_text = "Ok. Qual tarefa você vai começar agora?"
            data = {"target_status": TaskStatus.FAZENDO}
            
        else:
            intent = "unknown"
            response_text = "Desculpe, não entendi o que você disse. Pode repetir?"

        return {
            "intent": intent,
            "message": response_text,
            "data": data,
            "trigger_audio": True # Flag to signal we should generate audio
        }

    @classmethod
    def process_audio_command(cls, audio_file_path, user_id):
        # 1. Transcribe
        transcribed_text = cls._transcribe_audio(audio_file_path)
        
        if not transcribed_text:
            return {
                "success": False,
                "message": "Não consegui ouvir nada. Tente novamente.",
                "audio_base64": cls._generate_audio_response("Não consegui ouvir nada. Tente novamente.")
            }
            
        # 2. Process Intent
        result = cls.process_text_command(transcribed_text, user_id)
        
        # 3. Generate Audio Response
        audio_base64 = cls._generate_audio_response(result['message'])
        
        result['audio_base64'] = audio_base64
        result['transcription'] = transcribed_text
        result['success'] = True
        
        return result
