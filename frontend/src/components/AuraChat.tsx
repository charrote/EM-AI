import { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin } from 'antd';
import { SendOutlined, CloseOutlined, RobotOutlined, UserOutlined, BulbOutlined } from '@ant-design/icons';
import { Colors } from '../styles/theme';
import { useStore } from '../store/useStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
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
  const [thinking, setThinking] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [chatHeight, setChatHeight] = useState(560);
  const listRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startY: 0, startHeight: 560 });

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [currentThinking]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const delta = e.clientY - dragRef.current.startY;
      const newHeight = Math.max(560, dragRef.current.startHeight + delta);
      const maxHeight = window.innerHeight - 96;
      setChatHeight(Math.min(newHeight, maxHeight));
    };
    const onMouseUp = () => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setCurrentThinking('');

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
          stream: true,
          max_tokens: 4096,
          enable_thinking: thinking,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let replyContent = '';
      let thinkingContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta || {};
            if (thinking && delta.reasoning_content) {
              thinkingContent += delta.reasoning_content;
              setCurrentThinking(thinkingContent);
            }
            if (delta.content) {
              replyContent += delta.content;
            }
          } catch {}
        }
      }

      const finalContent = replyContent || '抱歉，暂时无法回答。';
      const finalThinking = thinking ? thinkingContent : '';
      if (finalThinking) {
        setCurrentThinking(finalThinking);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: finalContent, thinking: finalThinking }]);
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
          height: chatHeight,
          maxHeight: 'calc(100vh - 96px)',
          minHeight: 560,
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
                Aura助手
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
              <div>你好！我是 Aura助手</div>
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
              <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
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

        {thinking && (currentThinking || loading) && (
          <div
            style={{
              maxHeight: 200,
              overflow: 'auto',
              margin: '0 12px 8px',
              padding: 10,
              borderRadius: 8,
              background: '#FFF8E1',
              border: '1px solid #FFE082',
              fontSize: 12,
              lineHeight: 1.6,
              color: '#795548',
              flexShrink: 0,
            }}
            ref={thinkingRef}
          >
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#F57F17', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <BulbOutlined style={{ fontSize: 12 }} /> 思考过程
            </div>
            <div style={{ fontStyle: 'italic' }}>
              {currentThinking || '思考中...'}
            </div>
          </div>
        )}

        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${Colors.gray200}`,
            display: 'flex',
            gap: 8,
            flexShrink: 0,
            alignItems: 'flex-end',
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
          <div
            onClick={() => setThinking(!thinking)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              background: thinking ? '#FFF8E1' : 'transparent',
              color: thinking ? '#F57F17' : Colors.gray400,
              border: thinking ? '1px solid #FFE082' : '1px solid transparent',
              transition: 'all 0.2s',
              fontSize: 16,
            }}
            title={thinking ? '关闭思考' : '展示思考'}
          >
            <BulbOutlined />
          </div>
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
        <div
          onMouseDown={(e) => {
            dragRef.current = { dragging: true, startY: e.clientY, startHeight: chatHeight };
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
          }}
          style={{
            height: 6,
            cursor: 'ns-resize',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: `1px solid ${Colors.gray200}`,
            background: Colors.gray50,
            borderRadius: '0 0 12px 12px',
          }}
        >
          <div style={{ width: 32, height: 3, borderRadius: 2, background: Colors.gray300 }} />
        </div>
      </div>
    </>
  );
}
