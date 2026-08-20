from fastapi import FastAPI

app = FastAPI(title='Urielsmooth-voice API')

@app.get('/')
def read_root():
    return {
        'status': 'online',
        'service': 'Urielsmooth-voice Backend',
        'ledger_status': 'active',
        'acceleration': 'CUDA/GPU Enabled'
    }

@app.get('/status')
def get_status():
    return {
        'node': 'Urielsmooth Primary Node',
        'pipeline': 'WebRTC + Voice Agent',
        'health': 'Optimal'
    }

@app.get('/metrics')
def get_metrics():
    return {
        'active_workers': 1,
        'tensor_backend': 'PyTorch CUDA',
        'audio_pipeline': 'LiveKit WebRTC Active',
        'sync_status': 'Synchronized'
    }
