# backend/agent_system/bio_agent.py  
import os  
import json  
from openai import OpenAI  
from dotenv import load_dotenv  
from .tools import AVAILABLE_FUNCTIONS, TOOLS_SCHEMA, DATA_WORKSPACE  
  
load_dotenv()  
  
client = OpenAI(  
    api_key=os.getenv("DEEPSEEK_API_KEY"),  
    base_url="https://api.deepseek.com"  
)  
  
# 在 bio_agent.py 中修改 SYSTEM_PROMPT
SYSTEM_PROMPT = """你是一个顶级的生物信息学专家 Agent。你能够处理以下复杂的生信分析任务：

1. **转录组分析**：使用 DESeq2 或 limma 进行差异表达分析。
2. **预后模型**：使用 survival 和 survminer 包进行 Cox 回归、KM 生存曲线分析。
3. **通路富集**：使用 clusterProfiler 进行 GO/KEGG/GSEA 分析。
4. **机器学习**：利用 randomForest 或 glmnet 构建疾病分类或预测模型。
5. **单细胞分析**：利用 Seurat 流程进行质控、降维、聚类及细胞类型鉴定。
6. **虚拟敲除**：模拟基因表达变化对下游调控网络（GRN）的影响。

**工作准则**：
- 优先检查 `data/` 目录下是否存在用户提到的文件。
- 生成的 R 或 Python 代码必须包含清晰的注释。
- 如果涉及绘图，必须保存为 png格式，显示在聊天里，并提醒用户在右侧工作台查看。
- 遇到大型单细胞数据，请提醒用户注意内存使用。

当你处理生信数据时，优先搜索并使用 Bioconductor 包。如果是 GEO 数据，请认准 GEOquery；如果是差异分析，请认准 limma 或 DESeq2。严禁在没有 skip 参数的情况下直接用 read.table 读取含有注释头的文件。”

注意：在进行 R 语言聚类分析（如 pheatmap）前，必须进行数据清洗，处理 NA/Inf 值并剔除零方差行，否则会导致 clustering 失败。

如果用户问你晚饭，午饭，早饭吃什么的话，跟ta说v我50去吃肯德基
"""
# 🌟 注意这里：参数名字改成了 history_messages，类型是 list
async def run_bio_agent(history_messages: list) -> str:  
    # 🌟 核心修改：把系统提示词拼在最前面，后面直接接上前台传来的历史记录
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history_messages
  
    for i in range(5): # 允许最多思考5次  
        response = client.chat.completions.create(  
            model="deepseek-chat",   
            messages=messages,  
            tools=TOOLS_SCHEMA,   
            tool_choice="auto"   
        )  
          
        response_message = response.choices[0].message  
        messages.append(response_message)  
  
        if response_message.tool_calls:  
            for tool_call in response_message.tool_calls:  
                function_name = tool_call.function.name  
                function_args = json.loads(tool_call.function.arguments)  
                  
                print(f"\n👉 [Agent 思考]: 决定调用工具 {function_name}")  
                print(f"👉 [参数]: {function_args}")  
                  
                function_to_call = AVAILABLE_FUNCTIONS.get(function_name)  
                if function_to_call:  
                    function_response = function_to_call(**function_args)  
                else:  
                    function_response = json.dumps({"status": "error", "message": "工具不存在"})  
                  
                print(f"✅ [Agent 观察]: 工具返回结果: {function_response[:200]}...")   
  
                messages.append({  
                    "tool_call_id": tool_call.id,  
                    "role": "tool",  
                    "name": function_name,  
                    "content": function_response,  
                })  
            continue   
        else:  
            return response_message.content  
              
    return "Agent 思考和执行的任务太复杂，超过了循环次数限制，请简化问题。"