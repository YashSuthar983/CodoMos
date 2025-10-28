from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from beanie import PydanticObjectId
from pydantic import BaseModel
from datetime import datetime
import os
import aiofiles

from app.api.deps import get_current_user
from app.models.user import User
from app.models.message import Message, Attachment
from app.models.channel import Channel
from app.models.notification import Notification
from app.services.ws import manager

router = APIRouter(prefix="/messaging", tags=["messaging"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class MessageCreate(BaseModel):
    content: str = ""
    recipient_user_id: Optional[str] = None
    channel_id: Optional[str] = None
    mentions: List[str] = []


class MessageOut(BaseModel):
    id: str
    senderId: str
    content: str
    createdAt: str


@router.post("/dm", response_model=dict)
async def send_dm(payload: MessageCreate, user: User = Depends(get_current_user)):
    if not payload.recipient_user_id:
        raise HTTPException(status_code=400, detail="recipient_user_id required")
    msg = Message(
        sender=user,
        recipient_user=PydanticObjectId(payload.recipient_user_id),
        content=payload.content,
        mentions=payload.mentions,
    )
    await msg.insert()

    # Notify recipient
    await manager.send_to_user(str(payload.recipient_user_id), {
        "type": "dm",
        "messageId": str(msg.id),
        "content": msg.content,
        "senderId": str(user.id),
        "createdAt": msg.created_at.isoformat(),
    })
    # Echo to sender so they can see their own message in UI immediately
    await manager.send_to_user(str(user.id), {
        "type": "dm",
        "messageId": str(msg.id),
        "content": msg.content,
        "senderId": str(user.id),
        "createdAt": msg.created_at.isoformat(),
    })

    # Mentions -> notifications
    for username in payload.mentions:
        mentioned = await User.find_one(User.email == username)
        if mentioned:
            notif = Notification(user=mentioned, category="mention", message=msg.content, resource_id=str(msg.id))
            await notif.insert()
            await manager.send_to_user(str(mentioned.id), {"type": "notification", "id": str(notif.id)})

    return {"id": str(msg.id)}


@router.post("/channels", response_model=dict)
async def create_channel(name: str = Form(...), description: Optional[str] = Form(None), is_private: bool = Form(False), user: User = Depends(get_current_user)):
    ch = Channel(name=name, description=description, is_private=is_private, members=[user], created_by=user)
    await ch.insert()
    return {"id": str(ch.id)}


@router.post("/channel/message", response_model=dict)
async def send_channel_message(payload: MessageCreate, user: User = Depends(get_current_user)):
    if not payload.channel_id:
        raise HTTPException(status_code=400, detail="channel_id required")
    channel = await Channel.get(payload.channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    msg = Message(sender=user, channel_id=str(channel.id), content=payload.content, mentions=payload.mentions)
    await msg.insert()

    await manager.broadcast_channel(str(channel.id), {
        "type": "channel_message",
        "channelId": str(channel.id),
        "messageId": str(msg.id),
        "content": msg.content,
        "senderId": str(user.id),
        "createdAt": msg.created_at.isoformat(),
    })

    for username in payload.mentions:
        mentioned = await User.find_one(User.email == username)
        if mentioned:
            notif = Notification(user=mentioned, category="mention", message=msg.content, resource_id=str(msg.id))
            await notif.insert()
            await manager.send_to_user(str(mentioned.id), {"type": "notification", "id": str(notif.id)})

    return {"id": str(msg.id)}


@router.post("/upload", response_model=dict)
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    filepath = os.path.join(UPLOAD_DIR, f"{datetime.utcnow().timestamp()}_{file.filename}")
    async with aiofiles.open(filepath, 'wb') as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)
    return {"filename": file.filename, "url": f"/static/{os.path.basename(filepath)}"}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # token is email-based per get_current_user implementation
    await websocket.accept()
    user = await User.find_one(User.email == token)
    if not user:
        await websocket.close(code=4401)
        return
    try:
        await manager.connect_user(str(user.id), websocket)
        while True:
            data = await websocket.receive_json()
            # optional: handle client pings or joins
            action = data.get("action")
            if action == "join_channel" and data.get("channelId"):
                await manager.join_channel(data["channelId"], websocket)
    except WebSocketDisconnect:
        manager.disconnect_user(str(user.id), websocket)
