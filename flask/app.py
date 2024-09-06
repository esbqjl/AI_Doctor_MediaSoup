from flask import Flask, Response, request, jsonify, session
from flask_socketio import SocketIO, emit
from llm import patient_instructor
from tasks import clinical_note_task, ddx_task, qa_task, hpi_task, run_tasks
from state import state_store, initialize_state
import logging
import os
import re


log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)

socketio = SocketIO(app, async_mode='threading')

USE_WHISPER = os.getenv("USE_WHISPER", "true") == "true"
state_store['camera_on'] = False

def parse_text_to_dict(text):
    lines = re.split(r'\n', text)
    result = {}
    for line in lines:
        if ' [' in line and ']' in line:
            category, score = line.rsplit(' [', 1)
            score = score.rstrip(']')
            result[category.strip()] = int(score)
    return result

def parse_text_to_array(text):
    lines = re.split(r'\|', text)
    return lines

@socketio.on('connect')
def handle_connect():
    sid = request.sid
    initialize_state(sid)
    print(f'Client connected with id: {sid }')
    emit('response', {'message': f'Connected to the server with id: {sid }'},to=sid )

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    if sid in state_store:
        del state_store[sid]
    print(f'Client disconnected with id: {sid}')


@socketio.on('transcript')
def handle_transcript(data):
    room_id = data.get('roomId')
    transcription = data.get('transcription')

    if len(transcription)<=1:
        return False
    print(f'Received transcription for room {room_id}: {transcription}')
    sid = request.sid

    try:
        global state_store
        transcript_callback(transcription, sid)  # Pass sid to the callback
        return True
    except Exception as e:
        print(f"Error during start recording: {e}")
        return False
    


@socketio.on('set_summary')
def handle_set_summary(text):
    global state_store
    sid  = request.sid
    state_store["doctor_summary"] = text
    print('set_summary', sid , state_store["doctor_summary"])

# @socketio.on('generate_notes')
# def handle_generate_notes(doctors_hints):
#     global state_store
#     sid  = request.sid
#     print("transcript for note generation", state_store["transcript"])
#     print("doctors_hints", doctors_hints)
#     steam_handler = SocketIOCallback(lambda x: emit('generate_notes', x,to=sid ))
#     notes = run_tasks(tasks=[clinical_note_task],
#                       inputs={"input": doctors_hints,
#                               "transcript": state_store["transcript"]})
#     print("Generated notes", notes)
#     emit('generate_notes', notes, sid )


def send_cds_ddx_callback(output, sid):
    print(f"==> ddx_task.output: {output.raw_output}")
    parsed_data = parse_text_to_dict(output.raw_output)
    socketio.emit('cds_ddx', parsed_data, to=sid)

def send_transcript(output,sid):
    print(f"==>Transcript: {output}")
    socketio.emit('send_transcript', output, to=sid)


def send_cds_qa_callback(output, sid):
    print(f"==> qa_task.output: {output.raw_output}")
    socketio.emit('cds_qa', output.raw_output, to=sid)

def send_cds_hpi_callback(output, sid):
    print(f"==> hpi_task.output: {output.raw_output}")
    parsed_data = parse_text_to_array(output.raw_output)
    socketio.emit('cds_hpi', parsed_data, to=sid)


def start_socketio_server():
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)

def transcript_callback(text, sid):
    print(f"[main] transcript callback for SID: {sid}, patient_mode: {state_store[sid]['patient_mode']}, patient_recording: {state_store[sid]['patient_recording']}")
    
    state_store[sid]["transcript"] += text + "\n"
    
    # Directly run the tasks without threading
    qa_task.callback = lambda output: send_cds_qa_callback(output, sid)
    ddx_task.callback = lambda output: send_cds_ddx_callback(output, sid)
    hpi_task.callback = lambda output: send_cds_hpi_callback(output, sid)
    _ = run_tasks(tasks=[qa_task, ddx_task, hpi_task], inputs={"transcript": state_store[sid]["transcript"]})
    send_transcript(state_store[sid]["transcript"],sid)
