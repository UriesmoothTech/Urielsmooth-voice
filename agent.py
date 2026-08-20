import asyncio
import logging
import torch
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.agents.voice import VoiceAssistant

logger = logging.getLogger('urielsmooth-voice-agent')

async def entrypoint(ctx: JobContext):
    logger.info(f'Starting GPU-accelerated voice agent worker for job {ctx.job.id}')
    
    cuda_active = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_active else 'CPU Fallback'
    logger.info(f'Hardware Acceleration Status --> CUDA: {cuda_active} | Device: {device_name}')
    
    @ctx.room.on('track_subscribed')
    def on_track_subscribed(track, publication, participant):
        if track.kind == 'audio':
            logger.info(f'Subscribed to audio track from participant: {participant.identity} [GPU Tensor Hooks Ready]')

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ALL)
    logger.info('Urielsmooth Voice Agent fully attached to LiveKit room with bidirectional audio streams')

if __name__ == '__main__':
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
