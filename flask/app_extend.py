from flask import Flask
from flask_socketio import SocketIO, emit, join_room, leave_room
from concurrent.futures import ThreadPoolExecutor
from utils import recognizer, microphone
import numpy as np

app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet')

rooms = {}
executors = {}

def process_audio(recognizer, audio, model, fn):
    try:
        text = recognizer.recognize_whisper_api(audio)
        print("[whisper] transcript: ", text)

        # Cancels the noise words to some extent
        if len(text) > 8:
            fn(text)
        else:
            print("[whisper] ignored cause noise:", text)
    except Exception as e:
        print(f"Error processing audio: {e}")

def get_callback(fn):
    def callback(recognizer, audio):
        room_id = audio.get('room_id')
        executor = executors.get(room_id)
        if executor:
            executor.submit(process_audio, recognizer, audio['data'], "small.en", fn)
    return callback

def transcribe_whisper(fn, audio_data, room_id):
    callback = get_callback(fn)
    audio = np.frombuffer(audio_data, dtype=np.float32)
    callback(recognizer, {'data': audio, 'room_id': room_id})

@socketio.on('connect', namespace='/transcribe')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect', namespace='/transcribe')
def handle_disconnect():
    print('Client disconnected')
    for room_id, clients in rooms.items():
        if request.sid in clients:
            clients.remove(request.sid)
            if not clients:
                del rooms[room_id]
                del executors[room_id]

@socketio.on('join', namespace='/transcribe')
def handle_join(data):
    room_id = data['room']
    join_room(room_id)
    if room_id not in rooms:
        rooms[room_id] = []
        executors[room_id] = ThreadPoolExecutor(4)
    rooms[room_id].append(request.sid)
    print(f"Client {request.sid} joined room {room_id}")

@socketio.on('leave', namespace='/transcribe')
def handle_leave(data):
    room_id = data['room']
    leave_room(room_id)
    if room_id in rooms and request.sid in rooms[room_id]:
        rooms[room_id].remove(request.sid)
        if not rooms[room_id]:
            del rooms[room_id]
            del executors[room_id]
    print(f"Client {request.sid} left room {room_id}")

@socketio.on('audio', namespace='/transcribe')
def handle_audio(data):
    room_id = data['room']
    audio_data = data['audio']
    print(f'Received audio data of length: {len(audio_data)} for room {room_id}')
    if room_id in executors:
        transcribe_whisper(lambda text: emit('transcription', text, room=room_id), audio_data, room_id)

if __name__ == '__main__':
    try:
        with microphone as source:
            print("[whisper] Calibrating...")
            recognizer.adjust_for_ambient_noise(source)
    except Exception as e:
        print(f"Error during calibration: {e}")
    socketio.run(app, host='127.0.0.1', port=5000)