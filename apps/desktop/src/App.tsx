import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import {
  Bot,
  Check,
  Cog,
  FolderOpen,
  MessageSquarePlus,
  PencilLine,
  PanelLeft,
  SendHorizontal,
  X,
} from 'lucide-react'
import './index.css'
import { logRenderer } from './logger'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Conversation = {
  id: string
  threadId: string
  title: string
  updatedAt: string
}

type BackendState = {
  status: 'checking' | 'ready' | 'offline'
  detail: string
}

type DesktopConfig = {
  backendBaseUrl: string
}

const introMessages: Message[] = [
  {
    id: 'm-1',
    role: 'assistant',
    content: 'Harbor 客户端已经准备好。当前目标是直接连接 DeerFlow，把真实消息链路跑通。',
  },
]

function createThreadId() {
  return `thread-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function createConversation(title = '当前会话'): Conversation {
  return {
    id: `conv-${Date.now()}`,
    threadId: createThreadId(),
    title,
    updatedAt: '刚刚',
  }
}

function App() {
  const [workspacePath, setWorkspacePath] = useState('E:\\Agent')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(introMessages)
  const [conversations, setConversations] = useState<Conversation[]>([createConversation()])
  const [isResponding, setIsResponding] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [configPath, setConfigPath] = useState('')
  const [desktopConfig, setDesktopConfig] = useState<DesktopConfig>({
    backendBaseUrl: 'http://127.0.0.1:2026',
  })
  const [configDraft, setConfigDraft] = useState('http://127.0.0.1:2026')
  const [backendState, setBackendState] = useState<BackendState>({
    status: 'checking',
    detail: 'Checking DeerFlow',
  })
  const messageEndRef = useRef<HTMLDivElement | null>(null)

  const refreshBackendStatus = async () => {
    logRenderer('INFO', 'backend', 'refreshing backend status')
    const status = await window.harbor.getBackendStatus()

    setBackendState(
      status.ok
        ? {
            status: 'ready',
            detail: `DeerFlow Ready · ${status.baseUrl}`,
          }
        : {
            status: 'offline',
            detail: status.error ?? 'DeerFlow Offline',
          },
    )
  }

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isResponding])

  useEffect(() => {
    let cancelled = false
    logRenderer('INFO', 'app', 'starting initial config and backend bootstrap')

    Promise.all([window.harbor.getConfig(), window.harbor.getBackendStatus()])
      .then(([configSnapshot, status]) => {
        if (cancelled) {
          return
        }

        logRenderer('INFO', 'app', 'initial bootstrap finished', {
          backendBaseUrl: configSnapshot.config.backendBaseUrl,
          configPath: configSnapshot.path,
          backendOk: status.ok,
        })
        setDesktopConfig(configSnapshot.config)
        setConfigDraft(configSnapshot.config.backendBaseUrl)
        setConfigPath(configSnapshot.path)
        setBackendState(
          status.ok
            ? {
                status: 'ready',
                detail: `DeerFlow Ready · ${status.baseUrl}`,
              }
            : {
                status: 'offline',
                detail: status.error ?? 'DeerFlow Offline',
              },
        )
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        logRenderer('ERROR', 'app', 'initial bootstrap failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        setBackendState({
          status: 'offline',
          detail: error instanceof Error ? error.message : '配置初始化失败',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectWorkspace = async () => {
    logRenderer('INFO', 'workspace', 'select workspace clicked')
    const selected = await window.harbor.selectWorkspace()
    if (!selected) {
      logRenderer('INFO', 'workspace', 'select workspace cancelled')
      return
    }

    logRenderer('INFO', 'workspace', 'workspace updated', { path: selected })
    setWorkspacePath(selected)
  }

  const handleNewConversation = () => {
    logRenderer('INFO', 'conversation', 'new conversation created')
    setMessages(introMessages)
    setDraft('')
    setIsResponding(false)
    setConversations([createConversation('新会话')])
  }

  const handleSaveConfig = async () => {
    logRenderer('INFO', 'config', 'saving desktop config', { backendBaseUrl: configDraft })
    const snapshot = await window.harbor.updateConfig({
      backendBaseUrl: configDraft,
    })

    setDesktopConfig(snapshot.config)
    setConfigDraft(snapshot.config.backendBaseUrl)
    setConfigPath(snapshot.path)
    setIsSettingsOpen(false)
    logRenderer('INFO', 'config', 'desktop config saved', {
      backendBaseUrl: snapshot.config.backendBaseUrl,
      path: snapshot.path,
    })
    await refreshBackendStatus()
  }

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || isResponding) {
      logRenderer('DEBUG', 'chat', 'send skipped', {
        hasContent: Boolean(content),
        isResponding,
      })
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setIsResponding(true)
    setBackendState((current) =>
      current.status === 'offline'
        ? current
        : {
            status: 'checking',
            detail: 'Waiting for DeerFlow',
          },
    )
    setConversations((current) =>
      current.map((conversation, index) =>
        index === 0
          ? {
              ...conversation,
              title: content.slice(0, 18) || '当前会话',
              updatedAt: '刚刚',
            }
          : conversation,
      ),
    )

    try {
      const activeConversation = conversations[0]
      logRenderer('INFO', 'chat', 'sending user message', {
        threadId: activeConversation.threadId,
        messageLength: content.length,
        workspacePath,
      })
      const response = await window.harbor.sendMessage({
        threadId: activeConversation.threadId,
        message: content,
        workspacePath,
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
      }

      setMessages((current) => [...current, assistantMessage])
      setConversations((current) =>
        current.map((conversation, index) =>
          index === 0
            ? {
                ...conversation,
                title: response.title ?? (content.slice(0, 18) || conversation.title),
                updatedAt: '刚刚',
              }
            : conversation,
        ),
      )
      setBackendState({
        status: 'ready',
        detail: `DeerFlow Ready · ${desktopConfig.backendBaseUrl}`,
      })
      logRenderer('INFO', 'chat', 'received assistant reply', {
        threadId: activeConversation.threadId,
        replyLength: response.reply.length,
        title: response.title,
      })
    } catch (error) {
      logRenderer('ERROR', 'chat', 'chat request failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `DeerFlow 请求失败：${error instanceof Error ? error.message : '未知错误。'}`,
      }

      setMessages((current) => [...current, assistantMessage])
      setBackendState({
        status: 'offline',
        detail: error instanceof Error ? error.message : 'DeerFlow Offline',
      })
    } finally {
      setIsResponding(false)
    }
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="app-frame">
      <div className="app-toolbar">
        <button className="menu-bar-item" type="button">File</button>
        <button className="menu-bar-item" type="button">Edit</button>
        <button className="menu-bar-item" type="button">View</button>
        <button className="menu-bar-item" type="button">Window</button>
        <button className="menu-bar-item" type="button">Help</button>
        <button className="menu-bar-item with-icon" onClick={() => setIsSettingsOpen(true)} type="button">
          <Cog size={14} />
          <span>Settings</span>
        </button>
      </div>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand-panel">
              <div className="brand-mark">H</div>
              <div>
                <div className="brand-title">Harbor</div>
                <div className="brand-subtitle">本地 Agent 工作台</div>
              </div>
            </div>

            <button className="primary-button" onClick={handleNewConversation} type="button">
              <MessageSquarePlus size={16} />
              <span>新建对话</span>
            </button>
          </div>

          <div className="sidebar-label">会话</div>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button className="conversation-item active" key={conversation.id} type="button">
                <span className="conversation-title">{conversation.title}</span>
                <span className="conversation-time">{conversation.updatedAt}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="main-panel">
          <header className="topbar">
            <div className="topbar-title-group">
              <div className="topbar-icon">
                <PanelLeft size={16} />
              </div>
              <div>
                <div className="topbar-title">DeerFlow 直连验证</div>
                <div className="topbar-subtitle">真实对话请求、thread 保持与本地目录上下文提示</div>
              </div>
            </div>

            <div className="topbar-actions">
              <button className="ghost-button" onClick={handleSelectWorkspace} type="button">
                <FolderOpen size={16} />
                <span>选择目录</span>
              </button>
              <div className={`agent-badge ${backendState.status}`}>
                <Bot size={16} />
                <span>{isResponding ? 'Responding' : backendState.detail}</span>
              </div>
            </div>
          </header>

          <section className="workspace-strip">
            <span className="workspace-label">当前工作目录</span>
            <span className="workspace-path">{workspacePath}</span>
          </section>

          <section aria-live="polite" className="message-stream">
            {messages.map((message) => (
              <article className={`message-row ${message.role}`} key={message.id}>
                <div className="message-role">{message.role === 'assistant' ? 'Harbor' : 'You'}</div>
                <div className="message-content">{message.content}</div>
              </article>
            ))}
            {isResponding ? (
              <article className="message-row assistant pending">
                <div className="message-role">Harbor</div>
                <div className="message-content">正在生成回复...</div>
              </article>
            ) : null}
            <div ref={messageEndRef} />
          </section>

          <footer className="composer-shell">
            <div className="composer-hint">按 Enter 发送，Shift + Enter 换行</div>
            <div className="composer">
              <textarea
                className="composer-input"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="输入消息，发送到 DeerFlow..."
                rows={4}
                value={draft}
              />
              <button className="send-button" disabled={!draft.trim() || isResponding} onClick={handleSend} type="button">
                <SendHorizontal size={16} />
                <span>发送</span>
              </button>
            </div>
          </footer>
        </main>
      </div>

      {isSettingsOpen ? (
        <div className="settings-overlay" role="presentation">
          <section aria-label="Harbor settings" className="settings-dialog">
            <div className="settings-header">
              <div>
                <div className="settings-title">Harbor 配置中心</div>
                <div className="settings-subtitle">这里先管理 DeerFlow 地址，后面可以继续扩展更多配置项。</div>
              </div>
              <button className="icon-button" onClick={() => setIsSettingsOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>

            <div className="settings-body">
              <label className="settings-field">
                <span className="settings-label">DeerFlow Base URL</span>
                <input
                  className="settings-input"
                  onChange={(event) => setConfigDraft(event.target.value)}
                  placeholder="http://127.0.0.1:2026"
                  value={configDraft}
                />
              </label>

              <div className="settings-meta">
                <span className="settings-label">配置文件路径</span>
                <code className="settings-path">{configPath || 'Loading...'}</code>
              </div>

              <div className="settings-meta">
                <span className="settings-label">当前生效地址</span>
                <code className="settings-path">{desktopConfig.backendBaseUrl}</code>
              </div>
            </div>

            <div className="settings-actions">
              <button className="ghost-button" onClick={() => window.harbor.openConfigFile()} type="button">
                <PencilLine size={16} />
                <span>打开配置文件</span>
              </button>
              <button className="ghost-button" onClick={() => refreshBackendStatus()} type="button">
                <Check size={16} />
                <span>测试连接</span>
              </button>
              <button className="primary-button" onClick={handleSaveConfig} type="button">
                <Check size={16} />
                <span>保存配置</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
