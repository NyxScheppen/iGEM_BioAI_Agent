from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.chat import ChatRequest
from app.db.database import get_db
from app.services.chat_service import handle_chat

router = APIRouter()

@router.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    接口：
    POST /api/chat

    请求体支持：
    {
      "messages": [...]
    }

    同时支持：
    {
      "messages": [...],
      "session_id": "xxx"
    }
    """
    try:
        return await handle_chat(db, request.session_id, request.messages)
    except Exception as e:
        print(f"🔥 聊天接口报错: {e}")
        safe_error = str(e).replace('"', "'").replace("\n", " ")
        return {"reply": f"❌ 服务器开小差了: {safe_error}", "files": []}