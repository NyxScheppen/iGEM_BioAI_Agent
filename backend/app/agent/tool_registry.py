TOOL_REGISTRY = {}
TOOLS_SCHEMA = []

def register_tool(name: str, description: str, parameters: dict):
    """
    工具注册装饰器
    """
    def decorator(func):
        TOOL_REGISTRY[name] = func
        TOOLS_SCHEMA.append({
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": parameters
            }
        })
        return func
    return decorator