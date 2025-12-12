from flask import Blueprint, request, jsonify
from app.services.voice_service import VoiceService
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import tempfile

voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')

@voice_bp.route('/command', methods=['POST'])
@jwt_required(optional=True)
def process_voice_command():
    current_user_id = get_jwt_identity()
    if not current_user_id:
        current_user_id = 1 # Fallback for testing/unauthenticated voice
    
    voice_id = request.form.get('voiceId')
    
    # Check if a file is present in the request
    if 'audio' in request.files:
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            audio_file.save(temp_audio.name)
            temp_path = temp_audio.name
            
        try:
            result = VoiceService.process_audio_command(temp_path, current_user_id, voice_id)
        finally:
            # Cleanup upload temp
            try:
                os.remove(temp_path)
            except:
                pass
                
        return jsonify(result), 200

    # Fallback to text input
    data = request.get_json(silent=True)
    if data and 'text' in data:
        text = data.get('text')
        voice_id = data.get('voiceId') # Override from JSON if present
        
        result = VoiceService.process_text_command(text, current_user_id)
        
        # Generate audio for text input too if requested
        # But usually text input expects text response, unless "Speech Mode" is on.
        # We'll generate it just in case.
        if result.get('trigger_audio'):
             result['audio_base64'] = VoiceService._generate_audio_response(result['message'], voice_id)
             
        return jsonify(result), 200
        
    return jsonify({"error": "No audio file or text provided"}), 400
