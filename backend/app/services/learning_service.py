
import json
import os

class LearningService:
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    
    @staticmethod
    def _get_file_path(user_id):
        if not os.path.exists(LearningService.DATA_DIR):
            os.makedirs(LearningService.DATA_DIR)
        return os.path.join(LearningService.DATA_DIR, f'vocabulary_{user_id}.json')
    
    @staticmethod
    def load_vocabulary(user_id):
        filepath = LearningService._get_file_path(user_id)
        if not os.path.exists(filepath):
            return {}
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}

    @staticmethod
    def save_vocabulary(user_id, vocab):
        filepath = LearningService._get_file_path(user_id)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(vocab, f, ensure_ascii=False, indent=2)

    @staticmethod
    def learn_phrase(user_id, phrase, meaning):
        """
        Maps a user phrase to a system meaning/keyword.
        Example: phrase="detonar", meaning="excluir"
        """
        vocab = LearningService.load_vocabulary(user_id)
        vocab[phrase.lower()] = meaning.lower()
        LearningService.save_vocabulary(user_id, vocab)
        return True

    @staticmethod
    def apply_vocabulary(text, user_id):
        """
        Replaces learned phrases in text with their system meanings.
        """
        vocab = LearningService.load_vocabulary(user_id)
        # Sort by length descending to replace longest phrases first
        sorted_phrases = sorted(vocab.keys(), key=len, reverse=True)
        
        lower_text = text.lower()
        for phrase in sorted_phrases:
            if phrase in lower_text:
                # Replace logic
                # We need to be careful not to replace partial words appropriately?
                # For now simple replacement
                meaning = vocab[phrase]
                text = text.lower().replace(phrase, meaning)
                
        return text
