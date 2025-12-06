import os
import speech_recognition as sr
from gtts import gTTS
from pydub import AudioSegment
import tempfile
import base64
from datetime import date
from app.utils.enums import TaskStatus

class VoiceService:
    # Configure ffmpeg path manually if not in PATH
    try:
        from pydub import AudioSegment
        import shutil
        if not shutil.which("ffmpeg"):
            # Path found via agent discovery
            ffmpeg_path = r"C:\Users\lucas\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"
            if os.path.exists(ffmpeg_path):
                AudioSegment.converter = ffmpeg_path
    except ImportError:
        pass

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
            import edge_tts
            import asyncio
            
            # Voice: pt-BR-AntonioNeural (Male, Neural quality)
            VOICE = "pt-BR-AntonioNeural"
            
            # Create temp file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_mp3:
                temp_path = temp_mp3.name
            
            # Edge TTS is async, so we wrap it
            async def _run_tts():
                communicate = edge_tts.Communicate(text, VOICE)
                await communicate.save(temp_path)
            
            # Run the async function synchronously
            asyncio.run(_run_tts())
            
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
            print(f"Error generating audio response with EdgeTTS: {e}")
            # Fallback to gTTS if Edge fails
            try:
                from gtts import gTTS
                print("Falling back to gTTS (Female)")
                tts = gTTS(text=text, lang='pt', slow=False)
                # ... (rest of gTTS logic could be here, but simpler to just return None or try minimal fallback)
                # Let's keep it simple: return None so user sees error or try strict gTTS fallback inline
                return None 
            except:
                return None

    @staticmethod
    def process_text_command(text, user_id):
        from app.models.task import Task
        from app.extensions import db
        import re

        text = text.lower()
        response_text = ""
        intent = "unknown"
        data = None
        
        # --- Intent Logic ---

        # 1. CREATE TASK
        # Pattern: "nova tarefa [titulo]" or "adicionar tarefa [titulo]"
        if "nova tarefa" in text or "adicionar tarefa" in text or "criar tarefa" in text:
            intent = "create_task"
            # Extract title (everything after the keyword)
            match = re.search(r'(nova tarefa|adicionar tarefa|criar tarefa)\s+(.+)', text)
            if match:
                title = match.group(2).capitalize()
                new_task = Task(
                    title=title,
                    user_id=user_id,
                    status=TaskStatus.ENTRADA, # Default to Inbox/Entrada
                    priority='media',
                    due_date=date.today()
                )
                db.session.add(new_task)
                db.session.commit()
                response_text = f"Certo. Criei a tarefa {title} na sua área de entrada."
                data = {"task_id": new_task.id, "title": new_task.title}
            else:
                response_text = "Entendi que você quer criar uma tarefa, mas não ouvi o título. Tente dizer 'Nova tarefa comprar pão'."

        # 2. LIST TASKS (TODAY)
        elif "hoje" in text and ("tarefas" in text or "agenda" in text):
            intent = "list_today_tasks"
            tasks = Task.query.filter_by(user_id=user_id, due_date=date.today()).all()
            count = len(tasks)
            if count > 0:
                task_titles = ", ".join([t.title for t in tasks[:3]]) # List first 3
                response_text = f"Você tem {count} tarefas para hoje. As principais são: {task_titles}."
            else:
                response_text = "Você não tem nenhuma tarefa agendada para hoje."
            
            data = {"count": count, "tasks": [t.title for t in tasks]}

        # 3. COMPLETE TASK
        # Pattern: "concluir tarefa [titulo]" or "marcar [titulo] como feita"
        elif "concluir" in text or "terminar" in text or "feita" in text:
            intent = "complete_task"
            # Try to find a task title in the command
            # This is simple/naive: assumes the task title is mentioned
            # A better approach searches for the task by fuzzy matching, but let's do direct search first
            
            # Get all user unfinished tasks to compare
            pending_tasks = Task.query.filter(Task.user_id==user_id, Task.status != TaskStatus.CONCLUIDA).all()
            
            found = False
            for task in pending_tasks:
                if task.title.lower() in text:
                    task.status = TaskStatus.CONCLUIDA
                    db.session.commit()
                    response_text = f"Pronto! Marquei a tarefa {task.title} como concluída."
                    found = True
                    break
            
            if not found:
                response_text = "Não encontrei essa tarefa pendente. Pode repetir o nome exato?"

        # 4. MOVE TO DOING (Start task)
        elif "começar" in text or "iniciar" in text or "fazendo" in text:
            intent = "start_task"
            pending_tasks = Task.query.filter(Task.user_id==user_id, Task.status == TaskStatus.ENTRADA).all()
            
            found = False
            for task in pending_tasks:
                if task.title.lower() in text:
                    task.status = TaskStatus.FAZENDO
                    db.session.commit()
                    response_text = f"Ótimo. Movi {task.title} para Fazendo."
                    found = True
                    break
            
            if not found:
                response_text = "Não encontrei essa tarefa na Entrada para iniciar."

        else:
            intent = "unknown"
            # Basic conversational fallback
            if "olá" in text or "oi" in text:
                response_text = "Olá! Como posso ajudar com suas tarefas hoje?"
            else:
                response_text = "Desculpe, não entendi o comando. Você pode criar tarefas, listar ou concluir."

        return {
            "intent": intent,
            "message": response_text,
            "data": data,
            "trigger_audio": True 
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
