import subprocess
import sys
import time

def run_stack():
    print('=== Booting Urielsmooth-voice Stack ===')
    api_proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'])
    time.sleep(3)
    agent_proc = subprocess.Popen([sys.executable, 'agent.py', 'start'])
    print('=== Stack is fully online [API + WebRTC Agent Active] ===')
    try:
        api_proc.wait()
        agent_proc.wait()
    except KeyboardInterrupt:
        print('=== Shutting down Urielsmooth-voice Stack ===')
        api_proc.terminate()
        agent_proc.terminate()

if __name__ == '__main__':
    run_stack()
