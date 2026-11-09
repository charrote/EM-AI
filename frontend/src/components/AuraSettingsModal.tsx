import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, message, Alert, Tag, Tooltip } from 'antd';
import {
  ApiOutlined,
  KeyOutlined,
  DeploymentUnitOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { Colors } from '../styles/theme';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface AiConfig {
  provider: string;
  baseUrl: string;
  modelId: string;
  hasApiKey: boolean;
}

export default function AuraSettingsModal({ open, onClose, onSaved }: Props) {
  const [form] = Form.useForm();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setTestResult(null);
    api
      .get('/settings/ai')
      .then((res) => {
        const ai: AiConfig = res.data.data;
        form.setFieldsValue({
          provider: ai.provider,
          baseUrl: ai.baseUrl,
          apiKey: '',
          modelId: ai.modelId,
        });
        setHasApiKey(!!ai.hasApiKey);
      })
      .catch(() => {});
  }, [open, form]);

  const collect = () => {
    const v = form.getFieldsValue();
    return {
      provider: v.provider,
      baseUrl: v.baseUrl,
      modelId: v.modelId,
      // Key 留空则保持原值
      ...(v.apiKey ? { apiKey: v.apiKey } : {}),
    };
  };

  const handleTest = async () => {
    try {
      await form.validateFields(['baseUrl', 'modelId']);
    } catch {
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/ai/test', collect());
      if (res.data.ok) {
        setTestResult({
          ok: true,
          text: `连接成功${res.data.reply ? `，模型响应：「${res.data.reply}」` : ''}`,
        });
      } else {
        setTestResult({ ok: false, text: res.data.detail || res.data.error || `上游返回 ${res.data.status ?? '错误'}` });
      }
    } catch (e: any) {
      const d = e.response?.data;
      setTestResult({ ok: false, text: d?.detail || d?.error || e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings/ai', collect());
      message.success('模型配置已保存');
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudServerOutlined style={{ color: Colors.primary }} />
          Aura 模型配置
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={
        <>
          <Button icon={<ExperimentOutlined />} onClick={handleTest} loading={testing}>
            测试连接
          </Button>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave} loading={saving}>
            保存
          </Button>
        </>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ provider: 'openai' }}>
        <Form.Item
          name="provider"
          label="协议类型"
          rules={[{ required: true, message: '请选择协议类型' }]}
        >
          <Select
            options={[
              { value: 'openai', label: 'OpenAI 兼容（/v1/chat/completions）' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="baseUrl"
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ApiOutlined /> API 地址
            </span>
          }
          rules={[{ required: true, message: '请填写 API 地址' }]}
          tooltip="OpenAI 兼容服务的基地址，如 http://host:port/v1"
        >
          <Input placeholder="http://host:port/v1" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyOutlined /> API Key
              {hasApiKey && <Tag color="green">已配置{!form.getFieldValue('apiKey') ? '（留空保持不变）' : ''}</Tag>}
            </span>
          }
          rules={hasApiKey ? [] : [{ required: true, message: '请填写 API Key' }]}
        >
          <Input.Password placeholder={hasApiKey ? '留空则保持当前 Key' : 'sk-...'} />
        </Form.Item>
        <Form.Item
          name="modelId"
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <DeploymentUnitOutlined /> 模型名称
            </span>
          }
          rules={[{ required: true, message: '请填写模型名称' }]}
        >
          <Input placeholder="如 UANTEKDEV0、gpt-4o、qwen-max" />
        </Form.Item>
      </Form>
      {testResult && (
        <Alert
          type={testResult.ok ? 'success' : 'error'}
          showIcon
          message={testResult.ok ? '连接测试通过' : '连接测试失败'}
          description={testResult.text}
          style={{ marginTop: 4 }}
        />
      )}
      <div style={{ fontSize: 12, color: Colors.gray400, marginTop: 12, lineHeight: 1.7 }}>
        <Tooltip title="配置保存在服务端，对所有登录用户生效">
          配置保存在服务端 settings.json，Aura 对话与智能派工（自然语言解析）共用；API Key 不会下发到浏览器。
        </Tooltip>
      </div>
    </Modal>
  );
}
