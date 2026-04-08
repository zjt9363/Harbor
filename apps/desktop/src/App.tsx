import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import {
  Bot,
  FolderOpen,
  MessageSquarePlus,
  PanelLeft,
  SendHorizontal,
} from 'lucide-react'
import './index.css'

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

const introMessages: Message[] = [
  {
    id: 'm-1',
    role: 'assistant',
    content: 'Harbor 客户端已经准备好。当前目标是直接连接 DeerFlow，把真实消息链路跑通。',
  },
]

function createConversation(title = '当前会话'): Conversation {
  return {
    id: `conv-${Date.now()}`,
    threadId: crypto.randomUUID(),
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
  const [backendState, setBackendState] = useState<BackendState>({
    status: 'checking',
    detail: 'Checking DeerFlow',
  })
  const messageEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isResponding])

  useEffect(() => {
    let cancelled = false

    window.harbor.getBackendStatus().then((status) => {
      if (cancelled) {
        return
      }

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

    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectWorkspace = async () => {
    const selected = await window.harbor.selectWorkspace()
    if (!selected) {
      return
    }

    setWorkspacePath(selected)
  }

  const handleNewConversation = () => {
    setMessages(introMessages)
    setDraft('')
    setIsResponding(false)
    setConversations([createConversation('新会话')])
  }

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || isResponding) {
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
        detail: 'DeerFlow Ready',
      })
    } catch (error) {
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
    </div>
  )
}

export default App
