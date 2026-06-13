import { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin } from 'antd';
import { SendOutlined, CloseOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { Colors } from '../styles/theme';
import { useStore } from '../store/useStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = '我是友文科技Aura智能体，Aura具备感知设备现状，预测性维护的能力。制造业领域设备维护范畴以外的问答一律不提供服务。问及公司及所属，您就是友文智脑下单Aura智能体。回答客观简洁直接，不允许大长文，不允许过度渲染';

const API_BASE = 'http://nat.ywapi.com:9234/v1';
const API_KEY = 'ux-X2IQWMWLFNMRBZO2QJG8VQ314LW92EQ7';
const MODEL = 'UANTEKDEV0';

const GREETING = '您好，我是友文智脑Aura，具备感知设备现状和预测性维护的能力。请问有什么可以帮助您的？';

export default function AuraChat() {
  const { auraChatOpen, setAuraChatOpen } = useStore();
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...updated.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '抱歉，暂时无法回答。';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '连接失败，请稍后重试。' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {auraChatOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1040,
            background: 'rgba(0,0,0,0.3)',
          }}
          onClick={() => setAuraChatOpen(false)}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 64,
          right: 24,
          zIndex: 1050,
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          height: 560,
          maxHeight: 'calc(100vh - 96px)',
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: auraChatOpen ? 'translateY(0)' : 'translateY(-120%)',
          opacity: auraChatOpen ? 1 : 0,
          pointerEvents: auraChatOpen ? 'auto' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'top right',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: `1px solid ${Colors.gray200}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${Colors.primary}, #7C3AED)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 16,
              }}
            >
              <RobotOutlined />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: Colors.gray800, lineHeight: 1.3 }}>
                Aura 聊天智能体
              </div>
              <div style={{ fontSize: 11, color: Colors.gray400, lineHeight: 1.3 }}>
                Uantek Aura Agent
              </div>
            </div>
          </div>
          <div
            onClick={() => setAuraChatOpen(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: Colors.gray400,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = Colors.gray100; e.currentTarget.style.color = Colors.gray600; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = Colors.gray400; }}
          >
            <CloseOutlined style={{ fontSize: 14 }} />
          </div>
        </div>

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: Colors.gray400,
                fontSize: 13,
                gap: 8,
              }}
            >
              <RobotOutlined style={{ fontSize: 40, color: Colors.gray300 }} />
              <div>你好！我是 Aura 智能体</div>
              <div style={{ fontSize: 11 }}>请问有什么可以帮您？</div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 13,
                  background: msg.role === 'user' ? Colors.primary : `linear-gradient(135deg, ${Colors.primary}, #7C3AED)`,
                  color: '#FFFFFF',
                }}
              >
                {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
              </div>
              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? Colors.primary : Colors.gray100,
                  color: msg.role === 'user' ? '#FFFFFF' : Colors.gray800,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${Colors.primary}, #7C3AED)`,
                  color: '#FFFFFF',
                  fontSize: 13,
                }}
              >
                <RobotOutlined />
              </div>
              <Spin size="small" />
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${Colors.gray200}`,
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            variant="borderless"
            style={{
              flex: 1,
              background: Colors.gray100,
              borderRadius: 8,
              fontSize: 13,
              padding: '8px 12px',
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            style={{
              background: Colors.primary,
              borderColor: Colors.primary,
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </>
  );
}
