from flask import Flask, request, jsonify
import whisper
import os
from tempfile import NamedTemporaryFile

app = Flask(__name__)

# Load the Whisper model
model = whisper.load_model("base")

@app.route('/whisper', methods=['POST'])
def transcribe():
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save the file to a temporary file
    with NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(file.read())
        temp_file_path = temp_file.name

    # Use Whisper to transcribe the audio file
    try:
        result = model.transcribe(temp_file_path)
        os.remove(temp_file_path)  # Remove the temporary file
        return jsonify(result)
    except Exception as e:
        os.remove(temp_file_path)  # Remove the temporary file in case of error
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)