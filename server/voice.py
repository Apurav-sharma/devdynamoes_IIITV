# file: voice_command_matcher.py
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

CORS(app)
path = r"C:\Users\Apurav\OneDrive\Desktop\Project_ML\Cold_email_generator\models\all-MiniLM-L6-v2"
model = SentenceTransformer(path)
print(model)

# Your predefined commands
commands = {
    "scroll down": "scroll_down",
    "scroll up": "scroll_up",
    "delete line": "delete_line",
    "delete selection": "delete_selection",
    "copy from line": "copy_from_line",
    "copy code": "copy_all",
    "ask llm": "ask_llm",
    "find": "find_function",
    "format code": "format_code",
}
command_texts = list(commands.keys())
command_embeddings = model.encode(command_texts)

@app.route('/match-command', methods=['POST'])
def match_command():
    data = request.get_json()
    user_input = data["text"]

    user_embedding = model.encode([user_input])
    similarities = cosine_similarity(user_embedding, command_embeddings)[0]

    best_index = similarities.argmax()
    best_command = command_texts[best_index]
    matched_action = commands[best_command]

    return jsonify({
        "matched_command": best_command,
        "action": matched_action,
        "similarity": float(similarities[best_index])
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
