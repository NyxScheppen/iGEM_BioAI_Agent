import json
from openai import OpenAI
from app.core.config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, MODEL_NAME
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tool_registry import TOOL_REGISTRY, TOOLS_SCHEMA

# 触发 tools 下所有模块的工具注册
from app import tools  # noqa

client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url=DEEPSEEK_BASE_URL
)

async def run_bio_agent(history_messages: list) -> str:
    """
    Agent 主循环：
    1. 给模型 system prompt + 历史消息
    2. 模型决定是否调用工具
    3. 若调用工具，后端执行工具并把结果再喂回模型
    4. 最终返回自然语言回答
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history_messages

    for _ in range(25):
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto"
        )

        response_message = response.choices[0].message
        messages.append(response_message)

        if response_message.tool_calls:
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments or "{}")

                print(f"\n👉 [Agent] 调用工具: {function_name}")
                print(f"👉 [参数] {function_args}")

                func = TOOL_REGISTRY.get(function_name)
                if func:
                    tool_result = func(**function_args)
                else:
                    tool_result = json.dumps({
                        "status": "error",
                        "message": "工具不存在"
                    }, ensure_ascii=False)

                print(f"✅ [工具返回] {str(tool_result)[:300]}...")

                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": tool_result
                })
            continue

        return response_message.content or "分析完成，但模型未返回文本。"

    return "任务较复杂，超过最大工具调用轮次，请简化问题后重试。"