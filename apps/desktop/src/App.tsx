import {
  Bot,
  FolderOpen,
  MessageSquarePlus,
  Paperclip,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import './index.css'

type Conversation = {
  id: string
  title: string
  subtitle: string
  updatedAt: string
  unread?: boolean
}

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

const conversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'SkillOps Client MVP',
    subtitle: '桌面端整体结构和首轮交互布局',
    updatedAt: '刚刚',
  },
  {
    id: 'conv-2',
    title: '本地目录工作流',
    subtitle: '目录绑定、上下文展示和上传入口',
    updatedAt: '12 分钟前',
    unread: true,
  },
  {
    id: 'conv-3',
    title: 'Agent 接入预留',
    subtitle: '为 OpenClaw 和模型服务留接口',
    updatedAt: '1 小时前',
  },
]

const messages: Message[] = [
  {
    id: 'm-1',
    role: 'system',
    content: 'SkillOps 已准备好。先选择一个本地工作目录，再从这里开始你的对话和任务。',
  },
  {
    id: 'm-2',
    role: 'assistant',
    content:
      '当前阶段先使用桌面客户端承接聊天和本地工作区入口。之后我们会把会话、附件、Agent 调用逐步接入真实服务。',
  },
  {
    id: 'm-3',
    role: 'user',
    content: '我想围绕这个项目目录开始对话，并准备后面接入 OpenClaw 和本地模型。',
  },
]

function App() {
  const handleSelectWorkspace = async () => {
    const selected = await window.skillops.selectWorkspace()
    if (!selected) {
      return
    }

    window.alert(`已选择工作目录：\n${selected}`)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-panel">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-title">SkillOps</div>
            <div className="brand-subtitle">Desktop Client</div>
          </div>
        </div>

        <button className="primary-button">
          <MessageSquarePlus size={16} />
          <span>新建会话</span>
        </button>

        <div className="sidebar-search">
          <Search size={15} />
          <span>搜索会话</span>
        </div>

        <section className="sidebar-section">
          <div className="section-label">最近会话</div>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button
                className={`conversation-item ${conversation.id === 'conv-1' ? 'active' : ''}`}
                key={conversation.id}
                type="button"
              >
                <div className="conversation-title-row">
                  <span className="conversation-title">{conversation.title}</span>
                  <span className="conversation-time">{conversation.updatedAt}</span>
                </div>
                <div className="conversation-subtitle">{conversation.subtitle}</div>
                {conversation.unread ? <span className="conversation-unread" /> : null}
              </button>
            ))}
          </div>
        </section>

        <div className="sidebar-footer">
          <button className="footer-link" type="button">
            <Sparkles size={16} />
            <span>技能与能力</span>
          </button>
          <button className="footer-link" type="button">
            <Settings size={16} />
            <span>设置</span>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="main-header">
          <div>
            <div className="workspace-pill">本地工作区已连接</div>
            <h1>SkillOps 客户端 MVP</h1>
            <p>桌面端聊天、目录上下文和后端接入的第一版产品壳。</p>
          </div>

          <div className="header-actions">
            <button className="ghost-button" onClick={handleSelectWorkspace} type="button">
              <FolderOpen size={16} />
              <span>选择目录</span>
            </button>
            <div className="agent-badge">
              <Bot size={16} />
              <span>Agent Ready</span>
            </div>
          </div>
        </header>

        <section className="workspace-panel">
          <div>
            <div className="panel-label">当前工作目录</div>
            <div className="workspace-path">E:\Agent</div>
          </div>
          <div className="panel-meta">
            <span>会话绑定中</span>
            <span>本地目录能力已预留</span>
          </div>
        </section>

        <section className="message-stream">
          {messages.map((message) => (
            <article className={`message-card ${message.role}`} key={message.id}>
              <div className="message-role">
                {message.role === 'assistant' ? 'Agent' : message.role === 'system' ? 'System' : 'You'}
              </div>
              <div className="message-content">{message.content}</div>
            </article>
          ))}
        </section>

        <footer className="composer-shell">
          <div className="composer-toolbar">
            <button className="toolbar-button" type="button">
              <Paperclip size={15} />
              <span>添加附件</span>
            </button>
            <span className="toolbar-text">会话模式：基础 Agent</span>
          </div>

          <div className="composer">
            <textarea
              className="composer-input"
              placeholder="围绕当前工作目录输入你的问题、需求或下一步任务..."
              rows={4}
            />
            <button className="send-button" type="button">
              发送
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
