import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, ToolOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { Colors } from '../styles/theme';

const { Title, Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  // 获取登录前尝试访问的页面路径（来自 AuthGuard 的 state）
  const from = (location.state as { from?: string })?.from || '/';

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      const { token, user } = res.data;
      setAuth(token, user);
      message.success('登录成功，欢迎回来！');
      navigate(from, { replace: true });
    } catch {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 50%, #EEF2FF 100%)`,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰圆 */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${Colors.primary}08, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-8%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, #7C3AED08, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* 登录卡片 */}
      <div
        style={{
          width: 400,
          maxWidth: '100%',
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
          padding: '40px 36px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo 区 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${Colors.primary}, #7C3AED)`,
              color: '#FFFFFF',
              fontSize: 28,
              marginBottom: 16,
            }}
          >
            <ToolOutlined />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: Colors.gray900 }}>
            UantekEM-AI
          </Title>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
            AI 智能设备管理系统
          </Text>
        </div>

        {/* 登录表单 */}
        <Form
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          autoComplete="off"
          initialValues={{ username: 'admin', password: 'admin' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: Colors.gray400 }} />}
              placeholder="请输入用户名"
              variant="filled"
              style={{ borderRadius: 8, height: 44 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: Colors.gray400 }} />}
              placeholder="请输入密码"
              variant="filled"
              style={{ borderRadius: 8, height: 44 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 28 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 44,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                background: `linear-gradient(135deg, ${Colors.primary}, ${Colors.primaryLight})`,
                border: 'none',
                boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)',
              }}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </Form.Item>
        </Form>

        {/* 默认账号提示 */}
        <div
          style={{
            textAlign: 'center',
            padding: '12px 0 0',
            borderTop: `1px solid ${Colors.gray100}`,
          }}
        >
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: 12, color: Colors.gray400 }}>
              演示账号：admin / admin
            </Text>
            <Text style={{ fontSize: 11, color: Colors.gray300 }}>
              <ThunderboltOutlined style={{ marginRight: 4 }} />
              数据仅供演示
            </Text>
          </Space>
        </div>
      </div>
    </div>
  );
}
