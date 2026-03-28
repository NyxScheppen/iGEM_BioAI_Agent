# BioAgent Hub

一个面向 生物信息学任务的 AI Agent 平台。  
项目采用 **React + FastAPI** 前后端分离架构，结合 **大模型 Tool Calling**、**Python 工具链** 与 **R 生信分析流程**，用于实现从数据上传、任务理解、分析执行到结果展示的完整闭环。

---

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [项目目录结构](#项目目录结构)
- [主要文件结构](#主要文件结构)
- [助手模块](#助手模块)
---

## 项目简介

BioAgent Hub 是一个为生物信息学分析与合成生物学设计的智能 Agent 平台。  
用户可以通过网页端上传实验数据文件，输入自然语言分析需求，系统会调用大模型理解任务，并进一步通过本地工具执行实际分析，包括：

- 表达矩阵读取
- 差异表达分析
- 富集分析
- 生存分析
- 机器学习建模
- 单细胞/空间转录组分析
- R 脚本执行
- 生信图表生成
- 系统环境扫描

(待更新)

---

## 核心功能

| 分析类别 | 支持任务 | 工具链 |
|---------|---------|--------|
| **基础生信** | GC含量计算、文件预览、大型GEO矩阵读取 | Python + pandas |
| **差异表达** | bulk RNA-seq 差异分析、火山图/热图/PCA | R + limma |
| **单基因分析** | 表达差异、生存分析（KM/Cox）、共表达、相关性 | R + survival / cor |
| **预后建模** | LASSO-Cox、单/多因素Cox、机器学习分类（RF/SVM） | R + caret / glmnet |
| **通路富集** | GO / KEGG / GSEA / GSVA | R + clusterProfiler |
| **单细胞/空间** | （待扩展） | 未来支持 Seurat / Squidpy |
| **分子建模** | 蛋白质结构、相互作用、分子对接（待接入） | Python + BioPandas / RDKit |
| **筛选任务** | 药物虚拟筛选、核酸适配体设计 | （正在集成） |
| **文献检索** | PubMed / Europe PMC / Crossref / arXiv / bioRxiv | Python + requests |
| **系统诊断** | 检查 R/Python/Git/环境配置 | `scan_system_config` 工具 |

---

## 技术架构

### 前端
- React
- React Hooks (`useState`, `useEffect`, `useRef`)
- react-markdown

### 后端
- FastAPI
- Pydantic
- SQLAlchemy
- SQLite

### AI / Agent
- DeepSeek API（OpenAI 兼容调用方式）
- Tool Calling / Function Calling
- 自定义 Tool Registry

### 数据与分析
- Python: pandas
- R: data.table / 生信分析相关 R 包
- subprocess 调用 Rscript

---

## 项目目录结构

```bash
backend/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── core/                   # 配置与路径管理
│   ├── api/                    # 路由层
│   ├── schemas/                # Pydantic 请求模型
│   ├── agent/                  # Agent 核心逻辑与工具注册
│   ├── tools/                  # 工具函数模块
│   ├── db/                     # 数据库模型与 CRUD
│   ├── services/               # 业务逻辑层
│   └── utils/                  # 工具函数
├── storage/
│   ├── uploads/                # 用户上传文件
│   ├── generated/              # 系统生成结果文件
│   └── temp/                   # 临时脚本与中间文件
├── db_data/
│   └── app.db                  # SQLite 数据库文件
├── .env
└── requirements.txt

frontend/
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── ...
└── package.json
```
## 主要文件结构

```bash
frontend/
└── src/
    ├── main.jsx                 前端入口
    ├── App.jsx                  主页面：聊天、会话、上传、结果展示
    └── App.css                  页面样式

backend/app/
├── main.py                      FastAPI入口，注册路由、挂载/files、建表
├── api/
│   ├── chat.py                  API: POST /api/chat
│   ├── upload.py                API: POST /api/upload
│   ├── history.py               API: GET /api/history
│   └── system.py                API: GET /api/system-info
├── services/
│   ├── chat_service.py          聊天主流程调度
│   ├── file_service.py          上传文件保存
│   └── system_service.py        系统信息整理
├── agent/
│   ├── bio_agent.py             Agent主循环：模型+工具调用
│   ├── prompts.py               系统提示词
│   └── tool_registry.py         工具注册中心
├── tools/
│   ├── __init__.py              导入全部工具并触发注册
│   ├── basic_tools.py           基础工具(GC计算)
│   ├── file_tools.py            文件读取工具
│   ├── r_tools.py               R脚本执行工具
│   └── system_tools.py          系统扫描工具
├── db/
│   ├── database.py              数据库连接
│   ├── models.py                数据表定义
│   └── crud.py                  数据库增删查改
├── core/
│   ├── config.py                环境变量配置
│   └── paths.py                 路径配置
└── utils/
    ├── file_utils.py            文件类型识别
    └── response_formatter.py    回复中的文件链接解析与补全

```
---

## 助手模块
四位值班助手

| 动物 | 身份 | 性格 | 适合场景 |
|------|------|-------------|----------|
| **红鸟** | 小鸟医生（默认） | 温和认真 | 初学者友好、需要耐心引导时 |
| **狐狸** | 狐狸伯爵 | 优雅骄傲 | 傲娇厨 |
| **狮子** | 狮子画家 | 大部分时候不靠谱，小部分时候也不靠谱 | 轻松氛围、需要一个笨蛋陪着的时候 |
| **蛇** | 蛇观星家 | 高效冷漠 | 病娇厨 |


---

## 开发日志
### 2026/3/19
项目启动，搭建好了前端网页，连接了ai（暂时用deepseek）

实现了基本聊天功能和R语言自动分析功能

### 2026/3/22
增加了文档下载功能

增加了历史会话功能

修复了打不开图片的bug

### 2026/3/23
新增了助手模块

