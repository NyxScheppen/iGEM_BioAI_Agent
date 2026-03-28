import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_BASE = 'http://127.0.0.1:8000'

const ANIMAL_OPTIONS = [
  { key: 'bird', label: '🐦 小鸟医生', command: '我要找尼克斯' },
  { key: 'fox', label: '🦊 狐狸伯爵', command: '召唤莱恩哈特' },
  { key: 'lion', label: '🦁 狮子画家', command: '召唤罗兰' },
  { key: 'snake', label: '🐍 蛇观星家', command: '召唤德里' }
]

const ANIMAL_WELCOME_MESSAGES = {
  bird:
    '你、你好，啾……我是尼克斯。数据分析、结果解读、作图和建模这些工作，我都会认真帮你处理的。如果你已经准备好文件，就交给我吧。',
  fox:
    '既然来都来了，就把任务交代清楚些。我是莱恩哈特，会替你把分析、建模和结果整理妥当——当然，你最好别把文件弄得一团糟。',
  lion:
    '嗷呜！我、我是罗兰！虽然文件多的时候看起来像一场灾难，但我会努力把分析线索从纸堆里拖出来的。来吧，把任务交给我！',
  snake:
    '……我是德里。把数据、目标和要求一次说清，我不喜欢反复猜。只要输入别太离谱，分析我会做完。'
}

const ANIMAL_STATUS_MESSAGES = {
  bird:
    '请上传 .csv / .txt / .tsv / .xlsx 等文件，我会先帮你检查数据，再开始分析，啾。',
  fox:
    '请上传 .csv / .txt / .tsv / .xlsx 等文件。先把数据交上来，我才能替你做像样的分析。',
  lion:
    '把 .csv / .txt / .tsv / .xlsx 文件交给我吧！我会先确认数据结构，再努力冲进分析战场，嗷呜！',
  snake:
    '上传 .csv / .txt / .tsv / .xlsx 文件。先看数据，再谈分析，别让我对着空气推理。'
}

const ANIMAL_LOADING_MESSAGES = {
  bird: '尼克斯正在努力思考中',
  fox: '莱恩哈特优雅地批阅中',
  lion: '罗兰在文件堆里挣扎中',
  snake: '德里不情愿地工作中'
}

const ANIMAL_AVATARS = {
  bird: '🐦',
  fox: '🦊',
  lion: '🦁',
  snake: '🐍'
}

const ANIMAL_UPLOAD_ICONS = {
  bird: '🍃',
  fox: '⚜️',
  lion: '🖌️',
  snake: '⭐'
}

const ANIMAL_INPUT_PLACEHOLDERS = {
  bird: '键入分析指令… 左侧 🍃 可传入文件',
  fox: '键入分析指令… 左侧 ⚜️ 可传入文件',
  lion: '键入分析指令… 左侧 🖌️ 可传入文件',
  snake: '键入分析指令… 左侧 ⭐ 可传入文件'
}

const createSession = (animalMode = 'bird') => {
  const id =
    window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`

  return {
    id,
    title: '新会话',
    attachedFile: null,
    animalMode,
    messages: [
      {
        role: 'ai',
        content: ANIMAL_WELCOME_MESSAGES[animalMode] || ANIMAL_WELCOME_MESSAGES.bird
      }
    ],
    results: [
      {
        id: `status_${Date.now()}`,
        type: 'text',
        title: '🧬 实验室状态',
        content: ANIMAL_STATUS_MESSAGES[animalMode] || ANIMAL_STATUS_MESSAGES.bird
      }
    ]
  }
}

function App() {
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('bio_agent_sessions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {
        console.error('读取历史会话失败:', e)
      }
    }
    return [createSession()]
  })

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return localStorage.getItem('bio_agent_current_session_id') || null
  })

  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('bio_agent_sidebar_width')
    return saved ? Number(saved) : 260
  })

  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('bio_agent_chat_width')
    return saved ? Number(saved) : window.innerWidth * 0.5
  })

  const resizeMode = useRef(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentSessionId) || sessions[0] || null,
    [sessions, currentSessionId]
  )

  const currentTheme = currentSession?.animalMode || 'bird'
  const currentAnimalLabel =
    ANIMAL_OPTIONS.find((a) => a.key === currentTheme)?.label || '🐦 小鸟医生'
  const loadingText = ANIMAL_LOADING_MESSAGES[currentTheme] || ANIMAL_LOADING_MESSAGES.bird
  const uploadIcon = ANIMAL_UPLOAD_ICONS[currentTheme] || '🍃'
  const inputPlaceholder =
    ANIMAL_INPUT_PLACEHOLDERS[currentTheme] || ANIMAL_INPUT_PLACEHOLDERS.bird

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id)
    }
  }, [currentSessionId, sessions])

  useEffect(() => {
    localStorage.setItem('bio_agent_sessions', JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('bio_agent_current_session_id', currentSessionId)
    }
  }, [currentSessionId])

  useEffect(() => {
    localStorage.setItem('bio_agent_sidebar_width', String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    localStorage.setItem('bio_agent_chat_width', String(leftWidth))
  }, [leftWidth])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions, currentSessionId, isLoading])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizeMode.current) return

      const totalWidth = window.innerWidth
      const rightMinWidth = 320
      const chatMinWidth = 360
      const sidebarMinWidth = 220
      const sidebarMaxWidth = 420

      if (resizeMode.current === 'sidebar') {
        const nextSidebarWidth = e.clientX
        const maxAllowed = totalWidth - rightMinWidth - chatMinWidth - 12
        if (
          nextSidebarWidth >= sidebarMinWidth &&
          nextSidebarWidth <= Math.min(sidebarMaxWidth, maxAllowed)
        ) {
          setSidebarWidth(nextSidebarWidth)
        }
      }

      if (resizeMode.current === 'chat') {
        const nextChatWidth = e.clientX - sidebarWidth - 6
        const maxAllowed = totalWidth - sidebarWidth - rightMinWidth - 12
        if (nextChatWidth >= chatMinWidth && nextChatWidth <= maxAllowed) {
          setLeftWidth(nextChatWidth)
        }
      }
    }

    const stopResizing = () => {
      resizeMode.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResizing)
      document.body.style.userSelect = 'auto'
      document.body.style.cursor = 'default'
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResizing)
    }
  }, [sidebarWidth])

  const startResizeSidebar = () => {
    resizeMode.current = 'sidebar'
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  const startResizeChat = () => {
    resizeMode.current = 'chat'
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  const updateSession = (sessionId, updater) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? typeof updater === 'function'
            ? updater(session)
            : { ...session, ...updater }
          : session
      )
    )
  }

  const normalizeToAbsoluteFileUrl = (url) => {
    if (!url) return ''

    let finalUrl = String(url).trim()

    if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
      return finalUrl.replace('/workspace/', '/files/')
    }

    if (finalUrl.startsWith('/files/')) {
      return `${API_BASE}${finalUrl}`
    }

    if (finalUrl.startsWith('generated/')) {
      return `${API_BASE}/files/${finalUrl}`
    }

    if (finalUrl.startsWith('files/')) {
      return `${API_BASE}/${finalUrl}`
    }

    finalUrl = finalUrl.replace(/^\/+/, '')
    return `${API_BASE}/files/${finalUrl}`
  }

  const guessResultType = (file) => {
    if (!file) return 'file'
    if (file.type === 'image') return 'plot'
    return 'file'
  }

  const buildResultFromFile = (file) => {
    const absoluteUrl = normalizeToAbsoluteFileUrl(file.url || file.relative_path || file.name)

    return {
      id: `${file.relative_path || file.name}_${Date.now()}_${Math.random()}`,
      type: guessResultType(file),
      fileType: file.type || 'other',
      title: file.type === 'image' ? '📊 生物信息分析图表' : `🪶 ${file.name}`,
      content: file.type === 'image' ? `${absoluteUrl}?t=${Date.now()}` : absoluteUrl,
      rawUrl: absoluteUrl,
      filename: file.name || 'download',
      relativePath: file.relative_path || ''
    }
  }

  const mergeSessionResults = (session, incomingResults) => {
    const prevResults = session.results || []

    const existingKeys = new Set(
      prevResults.map((item) =>
        item.type === 'plot'
          ? `${item.filename || ''}|${(item.content || '').split('?')[0]}`
          : `${item.filename || ''}|${item.rawUrl || item.content || ''}`
      )
    )

    const uniqueNew = incomingResults.filter((item) => {
      const key =
        item.type === 'plot'
          ? `${item.filename || ''}|${(item.content || '').split('?')[0]}`
          : `${item.filename || ''}|${item.rawUrl || item.content || ''}`
      if (existingKeys.has(key)) return false
      existingKeys.add(key)
      return true
    })

    return [...uniqueNew, ...prevResults]
  }

  const updateWorkbench = (sessionId, aiReply, backendFiles = []) => {
    const markdownImgRegex = /!\[.*?\]\((.*?)\)/g
    const plainUrlRegex =
      /http:\/\/127\.0\.0\.1:8000\/files\/[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|svg|gif|webp)/gi
    const markdownLinkRegex = /\[([^\]]+)\]\((.*?)\)/g

    const imageUrls = new Set()
    const fileLinks = new Map()
    const newResults = []

    let match
    while ((match = markdownImgRegex.exec(aiReply)) !== null) {
      if (match[1]) imageUrls.add(match[1])
    }

    let urlMatch
    while ((urlMatch = plainUrlRegex.exec(aiReply)) !== null) {
      imageUrls.add(urlMatch[0])
    }

    let linkMatch
    while ((linkMatch = markdownLinkRegex.exec(aiReply)) !== null) {
      const text = linkMatch[1]
      const url = linkMatch[2]
      if (!url) continue

      const lower = url.toLowerCase()
      const isImage = /\.(png|jpg|jpeg|svg|gif|webp)(\?|$)/i.test(lower)

      if (isImage) {
        imageUrls.add(url)
      } else {
        const abs = normalizeToAbsoluteFileUrl(url)
        fileLinks.set(abs, {
          id: `md_${abs}_${Date.now()}_${Math.random()}`,
          type: 'file',
          fileType: 'other',
          title: `🪶 ${text || '结果文件'}`,
          content: abs,
          rawUrl: abs,
          filename: text || abs.split('/').pop() || 'download'
        })
      }
    }

    imageUrls.forEach((url) => {
      const finalUrl = normalizeToAbsoluteFileUrl(url)
      if (!finalUrl) return

      newResults.push({
        id: `img_${finalUrl}_${Date.now()}_${Math.random()}`,
        type: 'plot',
        fileType: 'image',
        title: '📊 生物信息分析图表',
        content: `${finalUrl}?t=${Date.now()}`,
        rawUrl: finalUrl,
        filename: finalUrl.split('/').pop() || 'plot.png'
      })
    })

    if (Array.isArray(backendFiles)) {
      backendFiles.forEach((file) => {
        newResults.push(buildResultFromFile(file))
      })
    }

    fileLinks.forEach((item) => newResults.push(item))

    if (newResults.length === 0) return

    updateSession(sessionId, (session) => ({
      ...session,
      results: mergeSessionResults(session, newResults)
    }))
  }

  const sendCustomMessage = async (customText, options = {}) => {
    if (!currentSession) return
    if (!customText?.trim()) return
    if (isLoading) return

    const { clearAttachedFile = true, clearInput = false } = options

    const newMessage = { role: 'user', content: customText }
    const updatedHistory = [...currentSession.messages, newMessage]

    updateSession(currentSession.id, {
      messages: updatedHistory,
      attachedFile: clearAttachedFile ? null : currentSession.attachedFile
    })

    if (clearInput) {
      setUserInput('')
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.id,
          messages: updatedHistory
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '请求失败')
      }

      updateSession(currentSession.id, (session) => ({
        ...session,
        title: data.title || session.title,
        messages: [...session.messages, { role: 'ai', content: data.reply || '分析完成。' }]
      }))

      updateWorkbench(currentSession.id, data.reply || '', data.files || [])
    } catch (error) {
      updateSession(currentSession.id, (session) => ({
        ...session,
        messages: [
          ...session.messages,
          { role: 'ai', content: `❌ 服务器开小差了: ${error.message}` }
        ]
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewSession = () => {
    const newSession = createSession()
    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setUserInput('')
    setIsLoading(false)
  }

  const handleSelectSession = (sessionId) => {
    setCurrentSessionId(sessionId)
    setUserInput('')
  }

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation()

    const filtered = sessions.filter((s) => s.id !== sessionId)
    if (filtered.length === 0) {
      const fresh = createSession()
      setSessions([fresh])
      setCurrentSessionId(fresh.id)
      return
    }

    setSessions(filtered)
    if (currentSessionId === sessionId) {
      setCurrentSessionId(filtered[0].id)
    }
  }

  const handleAnimalSwitch = async (animal) => {
    if (!currentSession || isLoading) return

    updateSession(currentSession.id, (session) => ({
      ...session,
      animalMode: animal.key,
      results: (session.results || []).map((item, index) =>
        index === 0 && item.title === '🧬 实验室状态'
          ? {
              ...item,
              content: ANIMAL_STATUS_MESSAGES[animal.key] || item.content
            }
          : item
      )
    }))

    await sendCustomMessage(animal.command, {
      clearAttachedFile: false,
      clearInput: false
    })
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !currentSession) return

    setIsLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', currentSession.id)

    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '文件上传失败')
      }

      updateSession(currentSession.id, (session) => ({
        ...session,
        attachedFile: data.filename || file.name,
        title: session.title === '新会话' ? data.filename || file.name : session.title
      }))
    } catch (error) {
      alert(error.message || '文件上传失败')
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  const sendMessage = async () => {
    if (!currentSession) return
    if (!userInput.trim() && !currentSession.attachedFile) return
    if (isLoading) return

    const displayContent = currentSession.attachedFile
      ? `发送的文件：[文件:${currentSession.attachedFile}] ${userInput}`
      : userInput

    await sendCustomMessage(displayContent, {
      clearAttachedFile: true,
      clearInput: true
    })
  }

  const renderResultCard = (res, index) => {
    if (res.type === 'plot') {
      return (
        <div key={res.id || index} className="result-card">
          <h3>{res.title}</h3>
          <div className="result-content">
            <img src={res.content} alt={res.filename || 'Analysis Plot'} />
            <div style={{ marginTop: '10px' }}>
              <a
                href={res.rawUrl || res.content}
                target="_blank"
                rel="noreferrer"
                download={res.filename || true}
              >
                下载图片
              </a>
            </div>
          </div>
        </div>
      )
    }

    if (res.type === 'file') {
      return (
        <div key={res.id || index} className="result-card">
          <h3>{res.title}</h3>
          <div className="result-content">
            <p style={{ marginBottom: '10px', wordBreak: 'break-all' }}>
              文件名：{res.filename || '未命名文件'}
            </p>
            <a
              href={res.rawUrl || res.content}
              target="_blank"
              rel="noreferrer"
              download={res.filename || true}
              className="download-btn"
            >
              下载文件
            </a>
          </div>
        </div>
      )
    }

    return (
      <div key={res.id || index} className="result-card">
        <h3>{res.title}</h3>
        <div className="result-content">
          <p>{res.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-container app-theme-${currentTheme}`}>
      {/* 左侧会话栏 */}
      <div className="sidebar-section" style={{ width: sidebarWidth }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
          <button
            onClick={handleNewSession}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: 'none',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ＋ 新会话
          </button>
        </div>

        <div style={{ padding: '12px', fontSize: '12px', color: '#ffffff' }}>历史会话</div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              style={{
                marginBottom: '8px',
                padding: '12px',
                borderRadius: '12px',
                cursor: 'pointer',
                background:
                  session.id === currentSessionId ? 'rgb(255, 255, 255)' : 'rgb(230, 230, 230)',
                border:
                  session.id === currentSessionId
                    ? '1px solid rgba(114,191,68,0.45)'
                    : '1px solid transparent'
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  marginBottom: '6px',
                  color: '#000000'
                }}
              >
                {session.title || '新会话'}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#000000',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{session.messages?.length || 0} 条消息</span>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  style={{
                    background: 'transparent',
                    color: '#000000',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 左拖拽条 */}
      <div className="resizer sidebar-resizer" onMouseDown={startResizeSidebar} />

      {/* 中间聊天区 */}
      <div className="chat-section" style={{ width: leftWidth }}>
        <div className="chat-card">
          <div className="chat-header">
            <div
              style={{
                fontSize: '24px',
                background: '#e8f5e9',
                padding: '8px',
                borderRadius: '12px'
              }}
            >
              {ANIMAL_AVATARS[currentTheme]}
            </div>

            <div className="header-info">
              <h2>{currentSession?.title || '生物信息学 Agent Hub'}</h2>
              <p>● ONLINE</p>
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#4b5563'
                }}
              >
                当前值班：{currentAnimalLabel}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '8px 20px 12px 20px',
              borderBottom: '1px solid #e8f0e8',
              background: '#f8fff6'
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ANIMAL_OPTIONS.map((animal) => {
                const active = currentTheme === animal.key

                return (
                  <button
                    key={animal.key}
                    onClick={() => handleAnimalSwitch(animal)}
                    disabled={isLoading}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: active ? '2px solid #72bf44' : '1px solid #d1d5db',
                      background: active ? '#e8f5e9' : '#ffffff',
                      color: '#111827',
                      fontWeight: active ? 700 : 500,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {animal.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="chat-window">
            {(currentSession?.messages || []).map((msg, index) => (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                <div className={`message-bubble ${msg.role}`}>
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={normalizeToAbsoluteFileUrl(href)}
                          target="_blank"
                          rel="noreferrer"
                          download
                        >
                          {children}
                        </a>
                      ),
                      img: ({ src, alt }) => (
                        <img
                          src={normalizeToAbsoluteFileUrl(src)}
                          alt={alt || 'result'}
                          style={{
                            maxWidth: '100%',
                            borderRadius: '8px',
                            marginTop: '8px'
                          }}
                        />
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-wrapper ai">
                <div className="message-bubble ai thinking-bubble">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="thinking-text">
                    {loadingText}
                    <span className="thinking-ellipsis">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            {currentSession?.attachedFile && (
              <div className="file-ready">📄 待处理: {currentSession.attachedFile}</div>
            )}

            <div className="input-container">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              <button
                className="N-btn"
                onClick={() => fileInputRef.current?.click()}
                title="上传文件"
                aria-label="上传文件"
              >
                {uploadIcon}
              </button>

              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={inputPlaceholder}
              />

              <button onClick={sendMessage} className="send-btn">
                发送
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 中拖拽条 */}
      <div className="resizer main-resizer" onMouseDown={startResizeChat} />

      {/* 右侧工作台 */}
      <div className="workbench-section">
        <div className="workbench-header">
          <span className="lab-tag">LAB</span>
          <h3>Analysis Workbench</h3>
        </div>

        {(currentSession?.results || []).map((res, index) => renderResultCard(res, index))}
      </div>
    </div>
  )
}

export default App