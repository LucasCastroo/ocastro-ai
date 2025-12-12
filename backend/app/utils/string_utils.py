
import difflib

def calculate_similarity(s1, s2):
    """
    Calculates the similarity between two strings using SequenceMatcher.
    Returns a ratio between 0 and 1.
    """
    if not s1 or not s2:
        return 0.0
    return difflib.SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

def find_best_match(query, options, threshold=0.6):
    """
    Finds the best match for 'query' in a list of 'options' (strings).
    Returns (best_match, score) logic, or just the best match item if score > threshold.
    Using a tuple list for options [(obj, title_str)] allows returning the object.
    
    :param query: The search string.
    :param options: List of items to search. If items are strings, uses them directly.
                    If items are objects/dicts, provide a key_extractor.
                    But for simplicity, let's assume options is a list of tuples: (object, string_representation)
    :param threshold: Minimum score 0-1 to accept.
    :return: The matching object or None.
    """
    best_score = 0
    best_item = None
    
    for item, text in options:
        score = calculate_similarity(query, text)
        if score > best_score:
            best_score = score
            best_item = item
            
    if best_score >= threshold:
        return best_item
    return None
