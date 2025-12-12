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
    def _generate_audio_response(text, voice_id=None):
        try:
            if not text or not text.strip():
                print("DEBUG: TTS received empty text. Skipping.")
                return None

            VoiceService._ensure_site_packages()
            import edge_tts
            import asyncio
            
            # Default Voice: pt-BR-AntonioNeural (Male, Neural quality)
            # Remove any whitespace that might have crept in
            voice_cleaned = voice_id.strip() if voice_id else "pt-BR-AntonioNeural"
            
            print(f"DEBUG: Generating TTS with Voice: '{voice_cleaned}' and Text: '{text[:50]}...'")
            
            # Create temp file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_mp3:
                temp_path = temp_mp3.name
            
            # Edge TTS is async, so we wrap it
            async def _run_tts():
                communicate = edge_tts.Communicate(text, voice_cleaned)
                await communicate.save(temp_path)
            
            # Run the async function synchronously
            try:
                asyncio.run(_run_tts())
            except Exception as async_err:
                print(f"DEBUG: asyncio error in EdgeTTS: {async_err}")
                raise async_err
            
            # Verify file size
            if os.path.getsize(temp_path) == 0:
                 raise Exception("Generated audio file is empty")

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
            except Exception as fallback_err:
                 print(f"Fallback TTS failed too: {fallback_err}")
                 return None
            except:
                return None

    @staticmethod
    def process_text_command(text, user_id):
        from app.models.task import Task
        from app.extensions import db
        import re
        from datetime import timedelta
        from app.services.learning_service import LearningService

        text_original = text
        text = text.lower()
        
        # 0. APPLY USER VOCABULARY
        # This replaces user custom synonyms with system keywords
        # e.g. "detonar tarefa" -> "excluir tarefa"
        text = LearningService.apply_vocabulary(text, user_id)
        
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
        
        # 0. LEARN VOCABULARY (New)
        # "Aprenda que 'tchau' significa 'sair'"
        # "Entenda 'riscar' como 'concluir'"
        if "aprenda que" in text or "entenda" in text and ("significa" in text or "como" in text):
             intent = "learn_vocabulary"
             
             # Regex strategies
             # 1. "Aprenda que X significa Y"
             match1 = re.search(r'aprenda que (.+) significa (.+)', text)
             
             # 2. "Entenda X como Y"
             match2 = re.search(r'entenda (.+) como (.+)', text)
             
             phrase = None
             meaning = None
             
             if match1:
                 phrase = match1.group(1).strip().strip("'").strip('"')
                 meaning = match1.group(2).strip().strip("'").strip('"')
             elif match2:
                 phrase = match2.group(1).strip().strip("'").strip('"')
                 meaning = match2.group(2).strip().strip("'").strip('"')
                 
             if phrase and meaning:
                 LearningService.learn_phrase(user_id, phrase, meaning)
                 response_text = f"Entendido. Quando você disser '{phrase}', eu vou entender como '{meaning}'."
             else:
                 response_text = "Não entendi o que devo aprender. Diga por exemplo: 'Aprenda que riscar significa concluir'."

        # 1. CREATE TASK
        # Pattern: "nova tarefa [titulo] [metadata]"
        elif "nova tarefa" in text or "adicionar tarefa" in text or "criar tarefa" in text:
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

        # 2a. LIST ALL TASKS
        elif "todas" in text and "tarefas" in text and not any(x in text for x in ["excluir", "deletar", "apagar", "limpar"]):
            intent = "list_all_tasks"
            # Get pending tasks first
            tasks = Task.query.filter(Task.user_id==user_id, Task.status != TaskStatus.CONCLUIDA).order_by(Task.due_date).limit(5).all()
            count = len(tasks)
            total_count = Task.query.filter(Task.user_id==user_id, Task.status != TaskStatus.CONCLUIDA).count()
            
            if count > 0:
                task_titles = ", ".join([t.title for t in tasks])
                response_text = f"Você tem {total_count} tarefas pendentes no total. As próximas são: {task_titles}."
            else:
                response_text = "Você não tem nenhuma tarefa pendente."
            
            data = {"count": total_count, "tasks": [t.title for t in tasks]}

        # 2b. LIST TASKS (TODAY)
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

        # 2c. DELETE LAST TASK
        elif "excluir" in text and ("última" in text or "ultima" in text):
             intent = "delete_last_task"
             # Find the most recently created task
             last_task = Task.query.filter_by(user_id=user_id).order_by(Task.created_at.desc()).first()
             
             if last_task:
                 db.session.delete(last_task)
                 db.session.commit()
                 response_text = f"Excluí a última tarefa criada: {last_task.title}."
                 data = {"deleted_task_id": last_task.id}
             else:
                 response_text = "Não encontrei nenhuma tarefa para excluir."

        # 3. COMPLETE TASK
        # Pattern: "concluir tarefa [titulo]" or "marcar [titulo] como feita"
        elif "concluir" in text or "terminar" in text or "feita" in text or "riscar" in text:
            intent = "complete_task"
            from app.utils.string_utils import find_best_match
            
            pending_tasks = Task.query.filter(Task.user_id==user_id, Task.status != TaskStatus.CONCLUIDA).all()
            
            clean_text = text
            # Clean common command words to isolate title
            clean_text = re.sub(r'\b(concluir|terminar|finalizar|marcar|como|feita|a|tarefa|de|da|o)\b', ' ', clean_text).strip()
            possible_title = clean_text
            
            target_task = None
            
            # 1. Fuzzy match
            task_options = [(t, t.title) for t in pending_tasks]
            # Lower threshold slightly for "concluir" as it's often quick
            target_task = find_best_match(possible_title, task_options, threshold=0.65)
            
            # 2. Substring fallback
            if not target_task:
                 for task in pending_tasks:
                    # If spoken title is inside real title (e.g "lançar notas")
                    if possible_title and possible_title in task.title.lower() and len(possible_title) > 3:
                        target_task = task
                        break
                    # If real title is inside spoken text (handled by regex cleaning usually, but for safety)
                    if task.title.lower() in text: 
                        target_task = task
                        break
            
            if target_task:
                target_task.status = TaskStatus.CONCLUIDA
                db.session.commit()
                response_text = f"Pronto! Marquei a tarefa {target_task.title} como concluída."
            else:
                response_text = "Não encontrei essa tarefa pendente. Pode repetir o nome exato?"

        # 4. MOVE TO DOING (Start task)
        elif "começar" in text or "iniciar" in text or "fazendo" in text:
            intent = "start_task"
            from app.utils.string_utils import find_best_match
            
            pending_tasks = Task.query.filter(Task.user_id==user_id, Task.status == TaskStatus.ENTRADA).all()
            
            clean_text = text
            clean_text = re.sub(r'\b(começar|iniciar|colocar|em|fazendo|a|tarefa|de|da)\b', ' ', clean_text).strip()
            possible_title = clean_text
            
            target_task = None
            
            # 1. Fuzzy match
            task_options = [(t, t.title) for t in pending_tasks]
            target_task = find_best_match(possible_title, task_options, threshold=0.7)
            
            if not target_task:
                 for task in pending_tasks:
                     if possible_title and possible_title in task.title.lower() and len(possible_title) > 3:
                        target_task = task
                        break
                     if task.title.lower() in text:
                        target_task = task
                        break

            if target_task:
                target_task.status = TaskStatus.FAZENDO
                db.session.commit()
                response_text = f"Ótimo. Movi {target_task.title} para Fazendo."
            else:
                response_text = "Não encontrei essa tarefa na Entrada para iniciar."

        # 5. CHANGE STATUS (NEW)
        # 5. CHANGE STATUS (NEW)
        elif "status" in text and ("mudar" in text or "alterar" in text or "definir" in text or "atualizar" in text):
            intent = "update_task_status"
            
            # 1. Determine Target Status
            new_status = None
            status_label = ""
            
            if "andamento" in text or "fazendo" in text or "progresso" in text:
                new_status = TaskStatus.FAZENDO
                status_label = "Em Andamento"
            elif "concluída" in text or "concluida" in text or "feita" in text or "terminada" in text:
                new_status = TaskStatus.CONCLUIDA
                status_label = "Concluída"
            elif "entrada" in text or "pendente" in text or "fazer" in text:
                new_status = TaskStatus.ENTRADA
                status_label = "Entrada"
                
            if new_status:
                # 2. Extract Task Title
                clean_text = text
                # Remove command verbs
                clean_text = re.sub(r'(altere|mudar|definir|atualizar) o status (da|de|na|no) (tarefa )?', '', clean_text)
                # Remove target status phrases
                clean_text = re.sub(r'para (em )?andamento', '', clean_text)
                clean_text = re.sub(r'para (fazendo|feita|concluída|concluida|terminada|entrada|pendente)', '', clean_text)
                
                possible_title = clean_text.strip()
                
                # 3. Find and Update Task
                all_tasks = Task.query.filter_by(user_id=user_id).all()
                target_task = None
                
                # Use fuzzy match
                from app.utils.string_utils import find_best_match
                task_options = [(t, t.title) for t in all_tasks]
                target_task = find_best_match(possible_title, task_options, threshold=0.7)
                
                if not target_task:
                    for task in all_tasks:
                        # If the spoken title is part of the real title (e.g. "revisar" for "revisar código")
                        if possible_title and possible_title in task.title.lower() and len(possible_title) > 3:
                            target_task = task
                            break
                        # If the real title is in the speech (reverse case)
                        if task.title.lower() in text:
                            target_task = task
                            break
                            
                if target_task:
                    target_task.status = new_status
                    db.session.commit()
                    response_text = f"Entendido. Mudei o status de {target_task.title} para {status_label}."
                else:
                    response_text = f"Não encontrei a tarefa referente a '{possible_title}'."
            else:
                response_text = "Entendi que quer mudar o status, mas para qual? Você pode dizer: fazendo, concluída ou entrada."

        # 6. UPDATE DATE
        # Keywords: mudar, alterar, definir, agendar, postergar, antecipar + data/prazo
        elif ("mudar" in text or "alterar" in text or "definir" in text or "agendar" in text or "prazo" in text) and ("data" in text or "prazo" in text or "dia" in text or "para" in text):
            intent = "update_task_date"
            from app.utils.string_utils import find_best_match
            
            new_date = None
            date_str_found = ""

            # 1. Parsing Date Logic
            months = {
                "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4, "maio": 5, "junho": 6,
                "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12
            }

            if "amanhã" in text:
                new_date = date.today() + timedelta(days=1)
                date_str_found = "amanhã"
            elif "hoje" in text:
                new_date = date.today()
                date_str_found = "hoje"
            else:
                # Regex for "20 de dezembro", "dia 20 de dezembro", "20/12"
                # Matches: (dia )?(\d+) (de )?(\w+)
                date_match = re.search(r'(dia\s+)?(\d+)\s+de\s+(\w+)', text)
                if date_match:
                    try:
                        day = int(date_match.group(2))
                        month_name = date_match.group(3)
                        month = months.get(month_name)
                        if month:
                            today = date.today()
                            year = today.year
                            candidate = date(year, month, day)
                            if candidate < today: candidate = date(year + 1, month, day)
                            new_date = candidate
                            date_str_found = date_match.group(0)
                    except: pass
                
                if not new_date:
                     # Simpler regex "dia 20" or just "20" (riskier, assumes prior keywords filtered context)
                     # Let's stick to "dia 20" for safety or look for patterns after "para"
                     date_match_simple = re.search(r'dia\s+(\d+)', text)
                     if date_match_simple:
                        try:
                            day = int(date_match_simple.group(1))
                            today = date.today()
                            candidate = date(today.year, today.month, day)
                            if candidate < today: 
                                # Move to next month
                                m = today.month + 1 if today.month < 12 else 1
                                y = today.year if today.month < 12 else today.year + 1
                                candidate = date(y, m, day)
                            new_date = candidate
                            date_str_found = date_match_simple.group(0)
                        except: pass

            if new_date:
                # 2. Extract Task Title
                # Remove the found date string
                clean_text = text.replace(date_str_found, "")
                
                # Remove command keywords
                # "altere a tarefa acordar ... para o prazo de ..." -> "acordar"
                clean_text = re.sub(r'(alterar|altere|mudar|definir|agendar|nova data|o prazo|a data|prazo|data|para|de|da|do|na|no|tarefa)', ' ', clean_text)
                clean_text = re.sub(r'\s+', ' ', clean_text).strip()
                
                possible_title = clean_text
                
                # 3. Find Task (Fuzzy)
                pending_tasks = Task.query.filter(Task.user_id==user_id, Task.status != TaskStatus.CONCLUIDA).all()
                task_options = [(t, t.title) for t in pending_tasks]
                
                target_task = find_best_match(possible_title, task_options, threshold=0.6)
                
                # Fallback: Substring
                if not target_task and possible_title:
                     for task in pending_tasks:
                        if possible_title in task.title.lower():
                            target_task = task
                            break
                            
                if target_task:
                    target_task.due_date = new_date
                    db.session.commit()
                    response_text = f"Entendido. Alterei a data de '{target_task.title}' para {new_date.strftime('%d/%m')}."
                else:
                    # Try finding ANY task if the title was completely eaten by regex
                    # (Fallback for "mudar data da ultima tarefa") - Optional, skipping for now to strictness
                    response_text = f"Entendi a data ({new_date.strftime('%d/%m')}), mas não encontrei a tarefa '{possible_title}'."
            else:
                 response_text = "Não consegui identificar para qual data você quer mudar."

        # 7a. DELETE ALL TASKS
        elif "tarefas" in text and "todas" in text and ("excluir" in text or "deletar" in text or "limpar" in text or "apagar" in text):
             intent = "delete_all_tasks"
             
             # Delete all tasks for the user
             try:
                 num_deleted = Task.query.filter_by(user_id=user_id).delete()
                 db.session.commit()
                 if num_deleted > 0:
                     response_text = f"Entendido. Excluí todas as suas {num_deleted} tarefas."
                 else:
                     response_text = "Você não tem tarefas para excluir."
                 data = {"deleted_count": num_deleted}
             except Exception as e:
                 db.session.rollback()
                 response_text = "Tive um problema ao excluir todas as tarefas."

        # 7. DELETE TASK
        elif "excluir" in text or "deletar" in text or "remover" in text or "apagar" in text:
            intent = "delete_task"
            from app.utils.string_utils import find_best_match
            
            # Clean text to isolate title
            # "excluir tarefa de lançar frequência" -> "lançar frequência"
            clean_text = text
            clean_text = re.sub(r'(excluir|deletar|remover|apagar) (a )?tarefa (de )?', '', clean_text)
            
            possible_title = clean_text.strip()
            
            if possible_title:
                all_tasks = Task.query.filter_by(user_id=user_id).all()
                target_task = None
                
                # 1. Prepare options for fuzzy search: (task, task.title)
                # We interpret "listar frequência" -> should match "Lançar frequência"
                # Similarity of "listar" and "lançar" is high.
                
                task_options = [(t, t.title) for t in all_tasks]
                
                # 2. Try Fuzzy Match (Threshold 0.6 is generous, maybe 0.7 for safety)
                # "ouvir tarefa de ler livro..." -> "ler livro..." vs "Ler livro do Pablo..."
                target_task = find_best_match(possible_title, task_options, threshold=0.7)
                
                # 3. Fallback: Substring Search if fuzzy fails
                if not target_task:
                    for task in all_tasks:
                        if possible_title in task.title.lower() and len(possible_title) > 3:
                            target_task = task
                            break
                        if task.title.lower() in possible_title:
                            target_task = task
                            break
                            
                if target_task:
                    db.session.delete(target_task)
                    db.session.commit()
                    response_text = f"Entendido. Excluí a tarefa {target_task.title}."
                    # Return deleted task id for frontend if needed
                    data = {"deleted_task_id": target_task.id}
                else:
                    response_text = f"Não encontrei nenhuma tarefa parecida com '{possible_title}' para excluir."
            else:
                response_text = "Qual tarefa você quer excluir? Diga o nome dela."

        # 8. UPDATE TITLE (NEW)
        elif "título" in text and ("alterar" in text or "mudar" in text or "definir" in text or "trocar" in text):
            intent = "update_task_title"
            
            # Example text: "na tarefa de desenvolvimento do projeto altere o título para projeto de desenvolvimento do conselho de educação"
            # Strategy: Split by "altere o título para" or similar separator
            
            separator_match = re.search(r'(altere|mudar|trocar|definir) o t[íi]tulo para', text)
            
            if separator_match:
                # Part 1: Before the command (Context about which task)
                # Part 2: After the command (New title)
                parts = text.split(separator_match.group(0))
                
                if len(parts) >= 2:
                    context_part = parts[0].strip() # "na tarefa de desenvolvimento do projeto"
                    new_title = parts[1].strip()   # "projeto de desenvolvimento do conselho de educação"
                    
                    # Clean context to find old title
                    old_possible_title = context_part
                    old_possible_title = re.sub(r'^(na|da) tarefa (de )?', '', old_possible_title)
                    old_possible_title = re.sub(r'^(no|do) item (de )?', '', old_possible_title)
                    old_possible_title = old_possible_title.strip()
                    
                    if old_possible_title and new_title:
                        all_tasks = Task.query.filter_by(user_id=user_id).all()
                        target_task = None
                        
                        # Find task
                        for task in all_tasks:
                            if task.title.lower() == old_possible_title:
                                target_task = task
                                break
                        
                        if not target_task:
                            for task in all_tasks:
                                if old_possible_title in task.title.lower() and len(old_possible_title) > 3:
                                    target_task = task
                                    break
                        
                        if target_task:
                            old_name = target_task.title
                            target_task.title = new_title.capitalize()
                            db.session.commit()
                            response_text = f"Entendido. Renomeei a tarefa '{old_name}' para '{target_task.title}'."
                            data = {"task_id": target_task.id, "new_title": target_task.title}
                        else:
                            response_text = f"Não encontrei a tarefa '{old_possible_title}' para renomear."
                    else:
                        response_text = "Não consegui identificar o nome antigo ou o novo nome da tarefa."
                else:
                    response_text = "Tente dizer: Na tarefa X mude o título para Y."
            else:
                 response_text = "Para mudar o nome, diga: Na tarefa X altere o título para Y."



        # 9. SELF IDENTIFICATION
        elif "seu nome" in text or "quem é você" in text or "quem voce" in text or "apresente" in text or "sua capacidade" in text:
             intent = "identity"
             response_text = "Eu sou o OCastro, seu agente pessoal inteligente. Eu posso ajudar você a organizar suas tarefas, criar lembretes, listar seus compromissos e muito mais. Basta me dizer o que precisa!"

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
    def process_audio_command(cls, audio_file_path, user_id, voice_id=None):
        # 1. Transcribe
        transcribed_text = cls._transcribe_audio(audio_file_path)
        
        if not transcribed_text:
            return {
                "success": False,
                "message": "Não consegui ouvir nada. Tente novamente.",
                "audio_base64": cls._generate_audio_response("Não consegui ouvir nada. Tente novamente.", voice_id)
            }
            
        # 2. Process Intent
        result = cls.process_text_command(transcribed_text, user_id)
        
        # 3. Generate Audio Response
        audio_base64 = cls._generate_audio_response(result['message'], voice_id)
        
        result['audio_base64'] = audio_base64
        result['transcription'] = transcribed_text
        result['success'] = True
        
        return result
