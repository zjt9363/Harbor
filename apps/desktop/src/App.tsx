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
  title: string
  updatedAt: string
}

const initialMessages: Message[] = [
  {
    id: 'm-1',
    role: 'assistant',
    content: 'Harbor 客户端已经准备好。现在这是一条本地模拟聊天链路，你可以先直接发送消息。',
  },
  {
    id: 'm-2',
    role: 'assistant',
    content: '下一步我们可以把这里的模拟回复替换成真实的 Agent Runtime 和本地模型服务。',
  },
]

const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: '当前会话',
    updatedAt: '刚刚',
  },
]

function App() {
  const [workspacePath, setWorkspacePath] = useState('E:\\Agent')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [isResponding, setIsResponding] = useState(false)
  const messageEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isResponding])

  const handleSelectWorkspace = async () => {
    const selected = await window.harbor.selectWorkspace()
    if (!selected) {
      return
    }

    setWorkspacePath(selected)
  }

  const handleNewConversation = () => {
    setMessages(initialMessages)
    setDraft('')
    setIsResponding(false)
    setConversations([
      {
        id: `conv-${Date.now()}`,
        title: '新会话',
        updatedAt: '刚刚',
      },
    ])
  }

  const handleSend = () => {
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

    window.setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `已收到你的消息：${content}\n\n这是一条本地模拟回复。当前我们已经打通了“发送消息 -> 接收消息 -> 展示消息”的最小客户端链路。`,
      }

      setMessages((current) => [...current, assistantMessage])
      setIsResponding(false)
    }, 650)
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
                <div className="topbar-title">最小聊天链路验证</div>
                <div className="topbar-subtitle">本地桌面端会话、目录选择与模拟回复</div>
              </div>
            </div>

            <div className="topbar-actions">
              <button className="ghost-button" onClick={handleSelectWorkspace} type="button">
                <FolderOpen size={16} />
                <span>选择目录</span>
              </button>
              <div className="agent-badge">
                <Bot size={16} />
                <span>{isResponding ? 'Responding' : 'Ready'}</span>
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
                placeholder="输入消息，先完成最小聊天链路..."
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
