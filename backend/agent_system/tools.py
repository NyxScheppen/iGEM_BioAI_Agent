# backend/agent_system/tools.py
import json
import os
import uuid
import subprocess
import pandas as pd
import gzip

# 获取项目根目录下的 data 文件夹绝对路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_WORKSPACE = os.path.join(BASE_DIR, "data")

if not os.path.exists(DATA_WORKSPACE):
    os.makedirs(DATA_WORKSPACE)

# ==========================================
# 1. 具体的工具函数定义
# ==========================================

def calculate_gc_content(sequence: str):
    """(工具1) 计算 DNA 序列的 GC 含量"""
    seq = sequence.upper()
    gc = (seq.count("G") + seq.count("C")) / len(seq) * 100 if len(seq) > 0 else 0
    return json.dumps({"gc_content_percentage": round(gc, 2)})

def read_csv_data(file_path: str):
    """(工具2) 读取 CSV 文件的表头和前 3 行"""
    file_name = os.path.basename(file_path)
    safe_path = os.path.join(DATA_WORKSPACE, file_name)
    
    try:
        if not os.path.exists(safe_path):
            return json.dumps({"status": "error", "message": f"文件不存在！请确保文件在 {DATA_WORKSPACE} 目录下。"})
        
        df = pd.read_csv(safe_path)
        info = {
            "columns": df.columns.tolist(),
            "preview": df.head(3).to_dict(orient="records"),
            "shape": df.shape
        }
        return json.dumps({"status": "success", "data": info})
    except Exception as e:
        return json.dumps({"status": "error", "message": f"读取失败: {str(e)}"})

def run_r_analysis(r_code: str):
    """(工具3) 接收 R 代码并在本地执行"""
    job_id = str(uuid.uuid4())[:8]
    script_name = f"temp_task_{job_id}.R"
    script_path = os.path.join(DATA_WORKSPACE, script_name)
    
    # 【优化】在代码最前面强制加上关闭警告和静默加载包的指令
    r_prefix = (
        'options(warn = -1)\n'
        'suppressMessages(library(dplyr, quietly = TRUE))\n'
        f'setwd("{DATA_WORKSPACE.replace(chr(92), "/")}")\n'
    )
    
    injected_code = r_prefix + r_code
    
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(injected_code)
    
    try:
        # 【优化】即使 returncode != 0，如果是警告信息也尝试返回 stdout
        result = subprocess.run(["Rscript", script_path], capture_output=True, text=True, timeout=120)
        
        if os.path.exists(script_path):
            os.remove(script_path)
            
        # 只要有标准输出，就优先返回标准输出
        if result.returncode == 0 or result.stdout:
            return json.dumps({"status": "success", "output": result.stdout + "\n" + result.stderr})
        else:
            return json.dumps({"status": "error", "error_message": result.stderr})
    except Exception as e:
        return json.dumps({"status": "error", "error_message": f"R 脚本出错: {str(e)}"})

def load_large_bio_data(file_path: str):
    """
    轻量级读取：只抓取元数据和前100行预览，绝不拖累内存
    """
    # 自动补全路径
    full_path = os.path.join(DATA_WORKSPACE, file_path)
    
    if not os.path.exists(full_path):
        return f"❌ 找不到文件: {file_path}，请检查路径。"

    try:
        metadata = {"titles": [], "characteristics": []}
        data_start_line = 0
        is_gz = full_path.endswith('.gz')
        opener = gzip.open if is_gz else open

        # 1. 快速扫描
        with opener(full_path, 'rt', encoding='utf-8', errors='ignore') as f:
            for i, line in enumerate(f):
                if line.startswith('!Sample_title'):
                    metadata["titles"] = line.strip().split('\t')[1:]
                elif line.startswith('!Sample_characteristics_ch1'):
                    metadata["characteristics"].append(line.strip().split('\t')[1:])
                elif "!series_matrix_table_begin" in line:
                    data_start_line = i + 1
                    break
                if i > 1000: break

        # 2. 仅读取前 100 行
        df_preview = pd.read_csv(
            full_path, 
            sep='\t', 
            skiprows=data_start_line, 
            nrows=100, 
            comment='!'
        )

        # 3. 构造安全的情报汇总
        summary = [
            f"✅ 文件识别成功: {file_path}",
            f"📊 矩阵预览: 共有 {len(df_preview.columns)} 列 (样本)",
            f"🆔 样本 ID 示例: {', '.join(list(df_preview.columns[1:6]))}..."
        ]

        if metadata["characteristics"]:
            first_char = metadata["characteristics"][0]
            sample_preview = first_char[:3] if len(first_char) >= 3 else first_char
            summary.append(f"🔍 探测到分组线索: {sample_preview}...")
            summary.append(f"💡 [指令]: 共有 {len(first_char)} 个样本分组信息。")
            summary.append("请你编写 R 脚本读取全量文件进行差异分析。")
        else:
            summary.append("⚠️ 未发现明确的分组特征，请尝试按样本标题分组。")

        return "\n".join(summary)

    except Exception as e:
        return f"❌ 读取失败。原因: {str(e)}。"

# ==========================================
# 2. 统一对外暴露的配置 (给 Agent 使用)
# ==========================================

# 【关键】在这里必须把所有函数都注册进去！
AVAILABLE_FUNCTIONS = {
    "calculate_gc_content": calculate_gc_content,
    "read_csv_data": read_csv_data,
    "run_r_analysis": run_r_analysis,
    "load_large_bio_data": load_large_bio_data  # 刚才你漏了这一行！
}

# 存放给大模型看的 Schema
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "calculate_gc_content",
            "description": "计算 DNA 序列的 GC 含量",
            "parameters": {
                "type": "object",
                "properties": {"sequence": {"type": "string", "description": "DNA 序列"}},
                "required": ["sequence"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_csv_data",
            "description": "读取服务器上 data 目录下的 CSV 文件预览。",
            "parameters": {
                "type": "object",
                "properties": {"file_path": {"type": "string", "description": "文件名，如 test.csv"}},
                "required": ["file_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_r_analysis",
            "description": "执行 R 代码进行生信分析，工作目录已锁定在 data 文件夹。生成图片请直接保存文件名。",
            "parameters": {
                "type": "object",
                "properties": {"r_code": {"type": "string", "description": "纯 R 语言代码"}},
                "required": ["r_code"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "load_large_bio_data",
            "description": "读取大型生信数据（.gz, .txt, .csv），支持自动跳过 GEO 矩阵的注释行。读取 GEO 数据前必用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "文件名，例如 GSE84402_series_matrix.txt.gz"}
                },
                "required": ["file_path"]
            }
        }
    }
]