from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
from typing import List, Dict
# 假设你的 run_bio_agent 已经支持接收 list 格式的历史记录
from agent_system.bio_agent import run_bio_agent 
import re 

app = FastAPI()

# --- 新加的这三行 ---
# 确保 backend 目录下有个 workspace 文件夹用来存图
os.makedirs("workspace", exist_ok=True) 
# 让 FastAPI 把这个文件夹变成可以通过网址访问的静态资源
app.mount("/workspace", StaticFiles(directory="workspace"), name="workspace")
# --------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路径管理
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_WORKSPACE = os.path.join(BASE_DIR, "data")

if not os.path.exists(DATA_WORKSPACE):
    os.makedirs(DATA_WORKSPACE)

# 挂载静态目录，这样前端访问 http://localhost:8000/files/test.png 就能看到图
app.mount("/files", StaticFiles(directory=DATA_WORKSPACE), name="files")

# --- 请求模型修改：接收完整历史记录 ---
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

        # 1. 跑 Agent
        answer = await run_bio_agent(standard_messages)   
        
        # 2. 【核心修改】自动搜寻所有的图片文件名
        # 假设你的 Agent 习惯生成 .png 或 .jpg
        image_names = re.findall(r'[\w\-]+\.(?:png|jpg|jpeg)', answer)
        # 去重
        image_names = list(set(image_names))
        
        # 3. 构造给前端 Workbench 的文件列表
        # 这里统一把路径指向我们挂载好的 /files 接口
        file_list = []
        for img in image_names:
            # 这里的逻辑是：如果 Agent 生成了图，它应该在 DATA_WORKSPACE 里
            # 如果你的 Agent 生成在根目录，记得加个 shutil.move(img, DATA_WORKSPACE)
            file_url = f"http://127.0.0.1:8000/files/{img}"
            file_list.append({
                "url": file_url,
                "name": img,
                "type": "image"
            })

        # 4. 替换文本中的路径，让左边聊天框也能显示图
        # 只要文本里提到这些图片名，就换成完整的 URL
        final_reply = answer
        for img in image_names:
            final_reply = final_reply.replace(img, f"http://127.0.0.1:8000/files/{img}")
            # 兼容下之前可能有的 data/ 前缀
            final_reply = final_reply.replace(f"data/{img}", f"http://127.0.0.1:8000/files/{img}")

        # 5. 【关键】返回 reply 的同时，返回 files 数组
        return {
            "reply": final_reply, 
            "files": file_list  # 这个 files 就是喂给右边 Workbench 的！
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