import { useEffect, useState } from 'react';
import { List, Tag, Input, Select, Empty, Spin, Space } from 'antd';
import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, FaultTypeColors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

export default function KnowledgeBase() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { isMobile } = useResponsive();

  useEffect(() => {
    const params: any = {};
    if (filter !== 'all') params.status = filter;
    if (search) params.search = search;

    api.get('/knowledge', { params }).then((res) => {
      setEntries(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, filter]);

  return (
    <div>
      <PageCard>
        {/* Search & Filter — 移动端纵向排列 */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 12 : 16,
        }}>
          <Input
            prefix={<SearchOutlined style={{ color: Colors.gray400 }} />}
            placeholder="搜索故障现象、原因、方案..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ flex: 1, borderRadius: 6 }}
            size={isMobile ? 'middle' : 'large'}
          />
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: '全部' },
              { value: 'approved', label: '已审核' },
              { value: 'pending', label: '待审核' },
            ]}
            style={{ width: isMobile ? '100%' : 120 }}
            size={isMobile ? 'middle' : 'large'}
          />
        </div>

        {/* List */}
        {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> :
          !entries.length ? <Empty description="暂无知识条目" /> :
          <List
            dataSource={entries}
            renderItem={(entry: any) => (
              <PageCard size="small" style={{ marginBottom: isMobile ? 6 : 8 }} bodyStyle={{ padding: isMobile ? '10px 12px' : '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <Space size={isMobile ? 4 : 8} wrap>
                    <BookOutlined style={{ color: Colors.primary, fontSize: isMobile ? 14 : 16 }} />
                    <strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray800 }}>{entry.title}</strong>
                    {entry.faultType && (
                      <Tag
                        color={FaultTypeColors[entry.faultType] || Colors.gray500}
                        style={{ borderRadius: 4, border: 'none', margin: 0, fontSize: isMobile ? 11 : 12 }}
                      >
                        {entry.faultType}
                      </Tag>
                    )}
                    <Tag
                      color={entry.status === 'approved' ? Colors.successLight : Colors.warningLight}
                      style={{ borderRadius: 4, border: 'none', margin: 0, fontSize: isMobile ? 11 : 12 }}
                    >
                      {entry.status === 'approved' ? '已审核' : '待审核'}
                    </Tag>
                  </Space>
                </div>
                <div style={{ marginTop: isMobile ? 6 : 8, fontSize: isMobile ? 12 : 13, color: Colors.gray600, lineHeight: 1.7 }}>
                  {entry.symptom && <div><strong>现象：</strong>{entry.symptom}</div>}
                  {entry.cause && <div><strong>原因：</strong>{entry.cause}</div>}
                  {entry.solution && <div><strong>方案：</strong>{entry.solution}</div>}
                </div>
                {entry.tags && (
                  <div style={{ marginTop: isMobile ? 4 : 8 }}>
                    {(entry.tags as string[]).map((tag: string) => (
                      <Tag key={tag} style={{ marginBottom: 4, borderRadius: 4, fontSize: isMobile ? 11 : 12 }}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </PageCard>
            )}
          />
        }
      </PageCard>
    </div>
  );
}
