from dotenv import load_dotenv
import os

if __name__ == "__main__":
    load_dotenv()
    assert os.getenv("GOOGLE_API_KEY"), "Please setup GOOGLE_API_KEY"
    assert os.getenv("OPENAI_API_KEY"), "Please setup OPENAI_API_KEY"
    print("[main] Running server thread")
    from app import start_socketio_server
    start_socketio_server()
