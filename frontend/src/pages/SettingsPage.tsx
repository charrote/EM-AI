import { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Space, Typography, message, Divider, Switch, Alert } from 'antd';
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import { Colors } from '../styles/theme';
import { useStore } from '../store/useStore';
import api from '../services/api';

const { Text, Title } = Typography;

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'azure', label: 'Azure' },
  { value: 'local', label: '本地部署' },
];

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [aiForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { dataMode, setDataMode } = useStore();
  const [isReal, setIsReal] = useState(dataMode === 'real');

  // 加载设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [modeRes, aiRes] = await Promise.all([
          api.get('/settings/dataMode'),
          api.get('/settings/ai'),
        ]);
        setIsReal(modeRes.data.data.mode === 'real');
        aiForm.setFieldsValue(aiRes.data.data);
      } catch {
        // 忽略错误，使用默认值
      }
    };
    fetchSettings();
  }, []);

  const handleModeChange = async (checked: boolean) => {
    try {
      await api.put('/settings/dataMode', { mode: checked ? 'real' : 'mock' });
      setIsReal(checked);
      setDataMode(checked ? 'real' : 'mock');
      message.success(`已切换到${checked ? '真实数据' : '模拟数据'}模式`);
    } catch {
      message.error('切换失败');
    }
  };

  const handleAiSave = async () => {
    try {
      const values = await aiForm.validateFields();
      setLoading(true);
      await api.put('/settings/ai', values);
      // 更新 store
      useStore.getState().setAuraAiModelProvider(values.provider);
      useStore.getState().setAuraAiModelBaseUrl(values.baseUrl);
      useStore.getState().setAuraAiModelApiKey(values.apiKey);
      useStore.getState().setAuraAiModelId(values.modelId);
      message.success('AI 配置已保存');
    } catch (err: any) {
      message.error(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <PageCard bodyStyle={{ padding: 24 }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <SettingOutlined style={{ fontSize: 24, color: Colors.primary }} />
          <Title level={4} style={{ margin: 0 }}>系统设置</Title>
        </div>

        {/* 数据模式设置 */}
        <Card title="系统数据模式" style={{ marginBottom: 24 }} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                当前模式：{isReal ? '真实数据' : '模拟数据'}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {isReal
                  ? '使用数据库中的真实业务数据，支持实际业务操作'
                  : '使用模拟生成的演示数据，方便展示和测试'}
              </Text>
            </div>
            <Switch
              checked={isReal}
              onChange={handleModeChange}
              checkedChildren="真实"
              unCheckedChildren="模拟"
              size="large"
            />
          </div>
          <Alert
            message="提示"
            description="切换模式后，页面将自动使用对应的数据源。当前页面将在下次刷新时生效。"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>

        {/* Aura AI 配置 */}
        <Card title="Aura AI 模型配置" style={{ marginBottom: 24 }} size="small">
          <Form
            form={aiForm}
            layout="vertical"
            initialValues={{
              provider: 'openai',
              modelId: 'gpt-4o',
            }}
          >
            <Form.Item
              name="provider"
              label="模型供应商"
              rules={[{ required: true, message: '请选择模型供应商' }]}
            >
              <Select options={PROVIDER_OPTIONS} />
            </Form.Item>

            <Form.Item
              name="baseUrl"
              label="Base URL"
              extra="API 基础地址，例如：https://api.openai.com/v1 或 http://localhost:8080/v1"
              rules={[{ required: true, message: '请输入 Base URL' }]}
            >
              <Input placeholder="https://api.openai.com/v1" />
            </Form.Item>

            <Form.Item
              name="apiKey"
              label="API Key"
              extra="用于 API 认证的密钥"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password placeholder="sk-..." />
            </Form.Item>

            <Form.Item
              name="modelId"
              label="模型 ID"
              extra="例如：gpt-4o、claude-3-opus 等"
              rules={[{ required: true, message: '请输入模型 ID' }]}
            >
              <Input placeholder="gpt-4o" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleAiSave}
                  loading={loading}
                >
                  保存配置
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    aiForm.resetFields();
                    aiForm.setFieldsValue({
                      provider: 'openai',
                      modelId: 'gpt-4o',
                    });
                  }}
                >
                  重置默认
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 其他设置占位 */}
        <Card title="其他设置" size="small">
          <Text type="secondary">更多设置项正在开发中...</Text>
        </Card>
      </PageCard>
    </div>
  );
}
