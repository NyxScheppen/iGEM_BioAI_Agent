from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.file_service import save_upload_file

router = APIRouter()

@router.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = "default",
    db: Session = Depends(get_db)
):
    """
    接口：
    POST /api/upload

    新增可选参数 session_id，前端不传也能跑
    """
    return save_upload_file(db, file, session_id=session_id)