import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

function App() {
  const [userInput, setUserInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', content: '你好！我是你的 生物信息学 专属 Agent。我已经准备好处理你的实验数据了。' }
  ])
  const [results, setResults] = useState([
    { type: 'text', title: '🧬 实验室状态', content: '请在左侧上传 .csv 或 .txt 文件开始分析。' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  
  // 默认左侧宽一点 (60%)
  const [leftWidth, setLeftWidth] = useState(window.innerWidth * 0.6) 
  const isResizing = useRef(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  const startResizing = () => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.userSelect = 'none';
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.userSelect = 'auto';
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    if (e.clientX > 350 && e.clientX < window.innerWidth - 300) {
      setLeftWidth(e.clientX);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

const updateWorkbench = (aiReply) => {   
    // 1. 增强版正则：既匹配 ![alt](url)，也匹配普通的 http...png 链接
    const markdownImgRegex = /!\[.*?\]\((.*?)\)/g;
    const plainUrlRegex = /http:\/\/127\.0\.0\.1:8000\/files\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|svg)/gi;
    
    const newPlots = [];
    const foundUrls = new Set(); // 用于去重

    // 匹配 Markdown 格式
    let match;
    while ((match = markdownImgRegex.exec(aiReply)) !== null) {
      foundUrls.add(match[1]);
    }

    // 匹配纯文本 URL 格式
    let urlMatch;
    while ((urlMatch = plainUrlRegex.exec(aiReply)) !== null) {
      foundUrls.add(urlMatch[0]);
    }

    // 处理所有找到的 URL
    foundUrls.forEach(url => {
      let finalUrl = url;

      // 核心修正：确保路径指向 /files/ 而不是 /workspace/
      if (!finalUrl.startsWith('http')) {
        const fileName = finalUrl.split('/').pop();
        finalUrl = `http://127.0.0.1:8000/files/${fileName}`; // 这里改成了 files
      } else {
        // 如果 Agent 吐出的 URL 包含 workspace，也强制修正为 files
        finalUrl = finalUrl.replace('/workspace/', '/files/');
      }

      newPlots.push({   
        type: 'plot',   
        title: '📊 生物信息分析图表',   
        content: `${finalUrl}?t=${new Date().getTime()}` // 加个时间戳防止浏览器缓存不刷新
      });
    });

    if (newPlots.length > 0) {
      // 过滤掉已经存在的图片，避免重复堆叠
      setResults(prev => {
        const existingUrls = prev.map(p => p.content.split('?')[0]);
        const uniqueNewPlots = newPlots.filter(p => !existingUrls.includes(p.content.split('?')[0]));
        return [...uniqueNewPlots, ...prev];
      });
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (response.ok) setAttachedFile(data.filename)
    } catch (error) { alert("文件上传失败") }
    finally { setIsLoading(false); event.target.value = '' }
  }

  const sendMessage = async () => {
    if (!userInput.trim() && !attachedFile) return
    if (isLoading) return

    // 1. 构造带文件标记的内容
    const displayContent = attachedFile ? `发送的文件：[文件:${attachedFile}] ${userInput}` : userInput
    const newMessage = { role: 'user', content: displayContent }
    
    // 2. 先更新本地 UI
    const updatedHistory = [...messages, newMessage]
    setMessages(updatedHistory)
    setUserInput(''); setAttachedFile(null); setIsLoading(true)

    try {
      // 3. 将整个历史记录发给后端
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory }), 
      })
      const data = await response.json()
      
      // 4. 追加 AI 回复
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }])
      updateWorkbench(data.reply)
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: '❌ 后端连接异常' }])
    } finally { setIsLoading(false) }
  }

  return (
    <div className="app-container">
      <div className="chat-section" style={{ width: leftWidth }}>
        <div className="chat-card">
          <div className="chat-header">
             <div style={{fontSize:'24px', background:'#e8f5e9', padding:'8px', borderRadius:'12px'}}>🧬</div>
             <div className="header-info">
               <h2>生物信息学 Agent Hub</h2>
               <p>● ONLINE</p>
             </div>
          </div>

          <div className="chat-window">
            {messages.map((msg, index) => (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                <div className={`message-bubble ${msg.role}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-wrapper ai">
                <div className="message-bubble ai thinking-bubble">
                  <div className="typing-dots"><span></span><span></span><span></span></div>
                  <span style={{color: '#72bf44', fontWeight:'bold', marginLeft:'10px'}}>正在分析...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            {attachedFile && <div className="file-ready">📄 待处理: {attachedFile}</div>}
            <div className="input-container">
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <button className="N-btn" onClick={() => fileInputRef.current.click()}>N</button>
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="键入生信分析指令..."
              />
              <button onClick={sendMessage} className="send-btn">发送</button>
            </div>
          </div>
        </div>
      </div>

      <div className="resizer" onMouseDown={startResizing} />

      <div className="workbench-section">
        <div className="workbench-header">
             <span className="lab-tag">LAB</span>
             <h3>Analysis Workbench</h3>
        </div>
        
        {results.map((res, index) => (
          <div key={index} className="result-card">
            <h3>{res.title}</h3>
            <div className="result-content">
              {res.type === 'plot' ? (
                <img src={res.content} alt="Analysis Plot" />
              ) : (
                <p>{res.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App