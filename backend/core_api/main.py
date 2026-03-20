from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
from typing import List, Dict
from agent_system.bio_agent import run_bio_agent 
import re 

app = FastAPI()

# 确保有个 data 文件夹，Agent 生成的图可以放在这里
os.makedirs("data", exist_ok=True) 
# 让 FastAPI 把这个文件夹变成可以通过网址访问的静态资源
app.mount("/data", StaticFiles(directory="data"), name="data")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路径管理
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # 获取 backend/core_api 的上一级目录，即 backend
DATA_WORKSPACE = os.path.join(BASE_DIR, "data") # 这个路径是 backend/data，Agent 生成的图会放在这里，前端也从这里访问

if not os.path.exists(DATA_WORKSPACE):
    os.makedirs(DATA_WORKSPACE)

# 挂载静态目录，这样前端访问 http://localhost:8000/files/test.png 就能看到图
app.mount("/files", StaticFiles(directory=DATA_WORKSPACE), name="files")

# 接收完整历史记录
class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]  # 格式: [{"role": "user", "content": "..."}, ...]

@app.post("/api/chat")   
async def chat_endpoint(request: ChatRequest):   
    try:   
        standard_messages = []  
        for msg in request.messages:  
            safe_role = "assistant" if msg.get("role") == "ai" else "user"  
            standard_messages.append({  
                "role": safe_role,  
                "content": str(msg.get("content", ""))  
            })  

        # 跑 Agent
        answer = await run_bio_agent(standard_messages)   
        
        # 自动搜寻所有的图片文件名
        image_names = re.findall(r'[\w\-]+\.(?:png|jpg|jpeg)', answer)
        # 去重
        image_names = list(set(image_names))
        
        # 构造给前端 Workbench 的文件列表
        # 这里统一把路径指向挂载好的 /files 接口
        file_list = []
        for img in image_names:
            # 如果 Agent 生成了图，它应该在 DATA_WORKSPACE 里
            file_url = f"http://127.0.0.1:8000/files/{img}"
            file_list.append({
                "url": file_url,
                "name": img,
                "type": "image"
            })

        # 替换文本中的路径，让左边聊天框也能显示图
        # 只要文本里提到这些图片名，就换成完整的 URL
        final_reply = answer
        for img in image_names:
            final_reply = final_reply.replace(img, f"http://127.0.0.1:8000/files/{img}")
            # 兼容下之前可能有的 data/ 前缀
            final_reply = final_reply.replace(f"data/{img}", f"http://127.0.0.1:8000/files/{img}")

        # 返回 reply 的同时，返回 files 数组
        return {
            "reply": final_reply, 
            "files": file_list  # 喂给右边 Workbench
        }  
        
    except Exception as e:   
        print(f"Error: {e}")   
        return {"reply": f"服务器内部出错了: {str(e)}", "files": []}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(DATA_WORKSPACE, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 返回文件名，方便前端展示
        return {
            "message": "上传成功", 
            "filename": file.filename, 
            "url": f"http://127.0.0.1:8000/files/{file.filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))