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

import re

@app.post("/api/chat")     
async def chat_endpoint(request: ChatRequest):     
    try:     
        standard_messages = []    
        # 接收前端传来的历史记录，转换成 Agent 需要的格式  
        for msg in request.messages:    
            safe_role = "assistant" if msg.get("role") == "ai" else "user"    
            standard_messages.append({    
                "role": safe_role,    
                "content": str(msg.get("content", ""))    
            })    

        # 跑 Agent  
        answer = await run_bio_agent(standard_messages)     
        
        # 1. 强制转码，干掉可能引发崩溃的隐藏非法字符和不可见字符
        answer = answer.encode('utf-8', 'ignore').decode('utf-8')
        answer = answer.replace('\x00', '')  # 干掉 Null byte
        
        # 匹配所有常规生信文件后缀
        all_files = re.findall(r'[\w\-]+\.(?:png|jpg|jpeg|csv|txt|rds|xlsx)', answer)  
        unique_files = list(set(all_files))  
    
        file_list = []  
        final_reply = answer  

        # Markdown 替换
        for f in unique_files:  
            file_url = f"http://127.0.0.1:8000/files/{f}"  
            ext = f.split('.')[-1].lower()  
            is_image = ext in ['png', 'jpg', 'jpeg']
            
            # 1. 组装给右侧 Workbench 的文件列表
            file_list.append({  
                "url": file_url,  
                "name": f,  
                "type": "image" if is_image else "data"  
            })  

            # 2. 替换左侧聊天框的文本（智能防套娃）
            # 如果 AI 已经很听话地按 Prompt 输出了带 URL 的格式，就不再替换了
            if file_url not in final_reply:
                # 决定 Markdown 的长相
                markdown_link = f"\n![{f}]({file_url})\n" if is_image else f"[{f}]({file_url})"
                
                # 先把 AI 可能会带的 "data/文件名" 这个前缀干掉，统一变成纯文件名
                final_reply = final_reply.replace(f"data/{f}", f)
                
                # 再次确认：如果文本里有纯文件名，且不在 Markdown 括号里，才替换
                # （直接 replace 最暴力有效，因为上面排除了 file_url 已经存在的情况）
                final_reply = final_reply.replace(f, markdown_link)  

        return {  
            "reply": final_reply,   
            "files": file_list  
        }  
        
    except Exception as e:     
        print(f"🔥 后端报错拦截: {e}") 
        # 报错信息也要清洗，绝对不能带破坏 JSON 结构的未经处理的引号/换行
        safe_error = str(e).replace('"', "'").replace('\n', ' ')
        return {"reply": f"❌ 服务器开小差了: {safe_error}", "files": []}

# 上传前端传来的文件
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