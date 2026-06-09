import { useEffect, useState } from 'react';
import { Card, List, Tag, Input, Select, Empty, Spin, Space, Rate } from 'antd';
import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../services/api';

export default function KnowledgeBase() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const params: any = {};
    if (filter !== 'all') params.status = filter;
    if (search) params.search = search;

    api.get('/knowledge', { params }).then((res) => {
      setEntries(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, filter]);

  const faultColors: Record<string, string> = {
    机械: 'red', 电气: 'blue', 液压: 'cyan', 气动: 'purple', 软件: 'geekblue',
  };

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索故障现象、原因、方案..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ flex: 1 }}
            size="large"
          />
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: '全部' },
              { value: 'approved', label: '已审核' },
              { value: 'pending', label: '待审核' },
            ]}
            style={{ width: 120 }}
            size="large"
          />
        </div>

        {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> :
          !entries.length ? <Empty description="暂无知识条目" /> :
          <List
            dataSource={entries}
            renderItem={(entry: any) => (
              <Card size="small" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <BookOutlined style={{ color: '#2563EB' }} />
                    <strong>{entry.title}</strong>
                    {entry.faultType && (
                      <Tag color={faultColors[entry.faultType] || 'default'}>{entry.faultType}</Tag>
                    )}
                    <Tag color={entry.status === 'approved' ? 'green' : 'orange'}>
                      {entry.status === 'approved' ? '已审核' : '待审核'}
                    </Tag>
                  </Space>
                </div>
                <div style={{ marginTop: 8 }}>
                  {entry.symptom && <div><strong>现象：</strong>{entry.symptom}</div>}
                  {entry.cause && <div><strong>原因：</strong>{entry.cause}</div>}
                  {entry.solution && <div><strong>方案：</strong>{entry.solution}</div>}
                </div>
                {entry.tags && (
                  <div style={{ marginTop: 8 }}>
                    {(entry.tags as string[]).map((tag: string) => (
                      <Tag key={tag} style={{ marginBottom: 4 }}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </Card>
            )}
          />
        }
      </Card>
    </div>
  );
}
