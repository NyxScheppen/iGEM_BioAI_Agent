import json
import uuid
import subprocess
from pathlib import Path
from app.agent.tool_registry import register_tool
from app.core.paths import TEMP_DIR, UPLOAD_DIR, GENERATED_DIR

def _list_generated_files(base_dir: Path):
    files = []
    if not base_dir.exists():
        return files

    for p in base_dir.rglob("*"):
        if p.is_file():
            rel = p.relative_to(GENERATED_DIR).as_posix()
            files.append({
                "name": p.name,
                "relative_path": f"generated/{rel}",
                "url": f"/files/generated/{rel}",
                "size_bytes": p.stat().st_size
            })
    return files

@register_tool(
    name="run_r_analysis",
    description="执行 R 代码进行生信分析。系统会自动创建本次任务输出目录，并返回生成文件列表。",
    parameters={
        "type": "object",
        "properties": {
            "r_code": {
                "type": "string",
                "description": "纯 R 代码"
            },
            "timeout": {
                "type": "integer",
                "description": "超时时间（秒），默认 300",
                "default": 300
            },
            "job_subdir": {
                "type": "string",
                "description": "可选，输出子目录名；为空时自动生成 job_id",
                "default": ""
            }
        },
        "required": ["r_code"]
    }
)
def run_r_analysis(r_code: str, timeout: int = 300, job_subdir: str = ""):
    job_id = job_subdir.strip() if job_subdir and job_subdir.strip() else str(uuid.uuid4())[:8]

    script_name = f"temp_task_{job_id}.R"
    script_path = Path(TEMP_DIR) / script_name

    Path(GENERATED_DIR).mkdir(parents=True, exist_ok=True)
    job_dir = Path(GENERATED_DIR) / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    r_prefix = f"""
library(data.table)

UPLOAD_DIR <- "{Path(UPLOAD_DIR).as_posix()}"
GENERATED_DIR <- "{Path(GENERATED_DIR).as_posix()}"
JOB_DIR <- "{job_dir.as_posix()}"

dir.create(GENERATED_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(JOB_DIR, recursive = TRUE, showWarnings = FALSE)

setwd(JOB_DIR)

smart_read <- function(file_path) {{
  if (!grepl("^/", file_path) && !grepl("^[A-Za-z]:", file_path)) {{
    file_path <- file.path(UPLOAD_DIR, file_path)
  }}
  if (!file.exists(file_path)) stop(paste("文件不存在:", file_path))
  return(file_path)
}}

ensure_output_dir <- function(subdir = NULL) {{
  if (is.null(subdir) || subdir == "") {{
    dir.create(JOB_DIR, recursive = TRUE, showWarnings = FALSE)
    return(JOB_DIR)
  }}
  out_dir <- file.path(JOB_DIR, subdir)
  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)
  return(out_dir)
}}

cat("R 环境已准备完成\\n")
cat(paste("UPLOAD_DIR =", UPLOAD_DIR, "\\n"))
cat(paste("GENERATED_DIR =", GENERATED_DIR, "\\n"))
cat(paste("JOB_DIR =", JOB_DIR, "\\n"))
"""

    injected_code = r_prefix + "\n" + r_code

    with open(script_path, "w", encoding="utf-8") as f:
        f.write(injected_code)

    try:
        result = subprocess.run(
            ["Rscript", str(script_path)],
            capture_output=True,
            text=True,
            timeout=int(timeout)
        )

        output_files = _list_generated_files(job_dir)

        if result.returncode == 0:
            return json.dumps({
                "status": "success",
                "job_id": job_id,
                "job_dir": f"generated/{job_id}",
                "stdout": result.stdout,
                "stderr": result.stderr,
                "output_files": output_files
            }, ensure_ascii=False)

        return json.dumps({
            "status": "error",
            "job_id": job_id,
            "job_dir": f"generated/{job_id}",
            "error_message": result.stderr or "R 脚本执行失败",
            "stdout": result.stdout,
            "output_files": output_files
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({
            "status": "error",
            "job_id": job_id,
            "job_dir": f"generated/{job_id}",
            "error_message": f"R 脚本执行失败: {str(e)}"
        }, ensure_ascii=False)

    finally:
        if script_path.exists():
            script_path.unlink()