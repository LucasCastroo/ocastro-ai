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
        
        # Path found via agent discovery
        ffmpeg_dir = r"C:\Users\lucas\AppData\Local\Microsoft\WinGet\Links"
        ffmpeg_exe = os.path.join(ffmpeg_dir, "ffmpeg.exe")
        ffprobe_exe = os.path.join(ffmpeg_dir, "ffprobe.exe")
        
        if os.path.exists(ffmpeg_exe):
            # Add to PATH so subprocess calls work
            if ffmpeg_dir not in os.environ["PATH"]:
                os.environ["PATH"] += os.pathsep + ffmpeg_dir
            
            # Explicitly set for pydub just in case
            AudioSegment.converter = ffmpeg_exe
            # pydub might check for ffprobe too
            if os.path.exists(ffprobe_exe):
                AudioSegment.ffprobe = ffprobe_exe
                
    except ImportError:
        pass

    @staticmethod
    def _transcribe_audio(audio_file_path):
        recognizer = sr.Recognizer()
        
        # Convert to WAV if necessary (SpeechRecognition prefers WAV)
        # Using pydub to handle conversion
        try:
            print(f"DEBUG: Processing audio file at {audio_file_path}")
            # Load audio (pydub handles many formats if ffmpeg is installed)
            audio = AudioSegment.from_file(audio_file_path)
            print(f"DEBUG: Audio loaded successfully. Duration: {len(audio)}ms")
            
            # Export to specific WAV format for SpeechRecognition
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                audio.export(temp_wav.name, format="wav")
                wav_path = temp_wav.name
            print(f"DEBUG: Exported to temporary WAV at {wav_path}")
                
            with sr.AudioFile(wav_path) as source:
                print("DEBUG: Reading audio source for recognition...")
                audio_data = recognizer.record(source)
                try:
                    # Using Google's free speech recognition
                    print("DEBUG: Sending to Google Speech Recognition...")
                    text = recognizer.recognize_google(audio_data, language="pt-BR")
                    print(f"DEBUG: Transcription result: {text}")
                    return text
                except sr.UnknownValueError:
                    print("DEBUG: Google Speech Recognition could not understand audio")
                    return None
                except sr.RequestError as e:
                    print(f"DEBUG: Could not request results from Google Speech Recognition service; {e}")
                    return None
            
            # Cleanup temp wav
            try:
                os.remove(wav_path)
            except:
                pass
                
        except Exception as e:
            print(f"Error processing audio: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def _ensure_site_packages():
        # Ensure user site-packages are in path (fix for edge-tts in some envs)
        import site
        import sys
        usersite = site.getusersitepackages()
        if usersite not in sys.path:
            sys.path.append(usersite)

    @staticmethod
    def _generate_audio_response(text):
        try:
            VoiceService._ensure_site_packages()
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
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_mp3:
                    tts.save(temp_mp3.name)
                    temp_path = temp_mp3.name
                
                with open(temp_path, "rb") as audio_file:
                    audio_bytes = audio_file.read()
                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                try:
                    os.remove(temp_path)
                except:
                    pass
                return audio_base64
            except:
                return None

    @staticmethod
    def process_text_command(text, user_id):
        from app.models.task import Task
        from app.extensions import db
        import re
        from datetime import timedelta

        text = text.lower()
        response_text = ""
        intent = "unknown"
        data = None
        
        # Helper to parse date from text
        def parse_date_from_text(input_text):
            parsed_date = None
            if "amanhã" in input_text:
                parsed_date = date.today() + timedelta(days=1)
            elif "hoje" in input_text:
                parsed_date = date.today()
            else:
                months = {
                    "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4, "maio": 5, "junho": 6,
                    "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12
                }
                # "dia 7 de dezembro"
                date_match = re.search(r'dia\s+(\d+)\s+de\s+(\w+)', input_text)
                if date_match:
                    try:
                        day = int(date_match.group(1))
                        month = months.get(date_match.group(2))
                        if month:
                            today = date.today()
                            year = today.year
                            candidate = date(year, month, day)
                            if candidate < today: candidate = date(year + 1, month, day)
                            parsed_date = candidate
                    except: pass
                
                if not parsed_date:
                    # "dia 7"
                    date_match_simple = re.search(r'dia\s+(\d+)', input_text)
                    if date_match_simple:
                        try:
                            day = int(date_match_simple.group(1))
                            today = date.today()
                            parsed_date = date(today.year, today.month, day)
                            if parsed_date < today:
                                if today.month == 12: parsed_date = date(today.year + 1, 1, day)
                                else: parsed_date = date(today.year, today.month + 1, day)
                        except: pass
            return parsed_date

        # --- Intent Logic ---

        # 1. CREATE TASK
        # Pattern: "nova tarefa [titulo] [metadata]"
        if "nova tarefa" in text or "adicionar tarefa" in text or "criar tarefa" in text:
            intent = "create_task"
            
            # Default values
            task_priority = 'media'
            task_due_date = date.today()
            
            # 1. Extract Priority
            priorities = {
                'alta': ['alta', 'urgente', 'importante'],
                'baixa': ['baixa', 'pouca'],
                'media': ['média', 'media', 'normal']
            }
            
            # Check for priority keywords and remove them from text to allow title extraction
            found_p = False
            for p_key, keywords in priorities.items():
                for kw in keywords:
                    if f"prioridade {kw}" in text or f"com {kw} prioridade" in text:
                        task_priority = p_key
                        # Remove content like "com baixa prioridade" or "prioridade baixa" from text
                        text = re.sub(f'(com )?prioridade {kw}', '', text)
                        text = re.sub(f'com {kw} prioridade', '', text)
                        found_p = True
                        break
                if found_p: break
            
            # 2. Extract Date (Deadline) within creation
            # Look for "para amanhã", "com prazo de até amanhã", "para o dia X"
            if "prazo" in text or "para" in text or "até" in text:
                # Attempt to extract date part
                # Heuristic: if we find date keywords, try to parse and remove
                extracted_date = parse_date_from_text(text)
                if extracted_date:
                    task_due_date = extracted_date
                    # Try to clean up text. This is harder because date phrases vary.
                    # We'll rely on the regex below to capture the title part mostly.
                    # Simple cleanup for common phrases:
                    text = re.sub(r'(com )?prazo (de )?(até )?(amanhã|hoje)', '', text)
                    text = re.sub(r'para (amanhã|hoje)', '', text)
                    text = re.sub(r'(com )?prazo (de )?até o dia \d+( de \w+)?', '', text)
                    # Note: imperfect removal but helps.
            
            # 3. Extract Title
            # After removal, extract what's left after the command trigger
            match = re.search(r'(nova tarefa|adicionar tarefa|criar tarefa)\s+(.+)', text)
            if match:
                raw_title = match.group(2).strip()
                # Clean up any trailing connection words
                title = re.sub(r'\s+(com|para)$', '', raw_title).capitalize()
                
                new_task = Task(
                    title=title,
                    user_id=user_id,
                    status=TaskStatus.ENTRADA, 
                    priority=task_priority,
                    due_date=task_due_date
                )
                db.session.add(new_task)
                db.session.commit()
                
                date_str = "hoje" if task_due_date == date.today() else task_due_date.strftime('%d/%m')
                response_text = f"Criei a tarefa {title} com prioridade {task_priority} para {date_str}."
                data = {"task_id": new_task.id, "title": new_task.title}
            else:
                response_text = "Entendi que você quer criar uma tarefa, mas não ouvi o título claramente."

        # 2. LIST TASKS (TODAY)
        elif "hoje" in text and ("tarefas" in text or "agenda" in text) and "mudar" not in text:
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

        # 5. UPDATE DATE (NEW)
        elif "mudar" in text or "alterar" in text or "prazo" in text or "para o dia" in text:
            intent = "update_task_date"
            
            # Find the task first
            pending_tasks = Task.query.filter(Task.user_id==user_id, Task.status != TaskStatus.CONCLUIDA).all()
            target_task = None
            for task in pending_tasks:
                if task.title.lower() in text:
                    target_task = task
                    break
            
            if target_task:
                new_date = None
                
                # Check for "amanhã" or "hoje"
                if "amanhã" in text:
                    new_date = date.today() + timedelta(days=1)
                elif "hoje" in text:
                    new_date = date.today()
                else:
                    # Regex for "dia X" or "dia X de [mes]"
                    # Mapping months
                    months = {
                        "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4, "maio": 5, "junho": 6,
                        "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12
                    }
                    
                    # Try explicit date pattern: "dia 7 de dezembro"
                    date_match = re.search(r'dia\s+(\d+)\s+de\s+(\w+)', text)
                    if date_match:
                        day = int(date_match.group(1))
                        month_name = date_match.group(2)
                        month = months.get(month_name)
                        if month:
                            # Assuming current year if month is ahead, or next year if month is passed? 
                            # Simplification: use current year, or next year if date passed
                            today = date.today()
                            year = today.year
                            try:
                                candidate_date = date(year, month, day)
                                if candidate_date < today:
                                    candidate_date = date(year + 1, month, day)
                                new_date = candidate_date
                            except ValueError:
                                pass
                    
                    if not new_date:
                        # Try just "dia X"
                        date_match_simple = re.search(r'dia\s+(\d+)', text)
                        if date_match_simple:
                            day = int(date_match_simple.group(1))
                            today = date.today()
                            # Use current month or next month logic could be complex, assume current month/next match
                            try:
                                candidate_date = date(today.year, today.month, day)
                                if candidate_date < today:
                                    # Try next month
                                    next_month = today.month + 1 if today.month < 12 else 1
                                    next_year = today.year if today.month < 12 else today.year + 1
                                    candidate_date = date(next_year, next_month, day)
                                new_date = candidate_date
                            except ValueError:
                                pass

                if new_date:
                    target_task.due_date = new_date
                    db.session.commit()
                    response_text = f"Atualizei a data da tarefa {target_task.title} para {new_date.strftime('%d/%m')}."
                else:
                    response_text = f"Encontrei a tarefa {target_task.title}, mas não entendi a nova data."
            else:
                response_text = "Não encontrei a tarefa que você quer alterar."

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
