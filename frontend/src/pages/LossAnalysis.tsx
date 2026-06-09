import { useEffect, useState } from 'react';
import { Card, Table, Tag, Row, Col } from 'antd';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

export default function LossAnalysis() {
  const [pareto, setPareto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/pareto?scope=plant').then((res) => {
      setPareto(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const paretoChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: pareto.map((p) => p.cause), axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '停机时长 (分钟)' },
      { type: 'value', name: '累计百分比 (%)', max: 100 },
    ],
    series: [
      {
        type: 'bar',
        data: pareto.map((p) => p.duration),
        itemStyle: {
          color: (params: any) => {
            const cum = pareto[params.dataIndex]?.cumulative || 0;
            return cum <= 80 ? '#EF4444' : cum <= 90 ? '#F59E0B' : '#3B82F6';
          },
        },
      },
      {
        type: 'line',
        yAxisIndex: 1,
        data: pareto.map((p) => p.cumulative),
        lineStyle: { color: '#2563EB', width: 2 },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };

  const columns = [
    { title: '原因', dataIndex: 'cause', key: 'cause' },
    { title: '发生次数', dataIndex: 'count', key: 'count', sorter: (a: any, b: any) => b.count - a.count },
    { title: '停机时长 (min)', dataIndex: 'duration', key: 'duration', sorter: (a: any, b: any) => b.duration - a.duration,
      render: (v: number) => <strong>{v}</strong>,
    },
    { title: '占比', dataIndex: 'percentage', key: 'percentage', render: (v: number) => `${v}%` },
    { title: '累计占比', dataIndex: 'cumulative', key: 'cumulative',
      render: (v: number) => (
        <Tag color={v <= 80 ? 'red' : v <= 90 ? 'orange' : 'blue'}>{v.toFixed(1)}%</Tag>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="帕累托分析 — TOP 损失原因 (80/20 法则)">
            <ReactECharts option={paretoChartOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>

      <Card title="损失明细" style={{ marginTop: 16 }}>
        <Table
          dataSource={pareto}
          columns={columns}
          rowKey="cause"
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong>TOP 3 占总量</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + p.count, 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + p.duration, 0)} min</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + p.percentage, 0).toFixed(1)}%</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Tag color="red">{pareto[2]?.cumulative.toFixed(1) || 0}%</Tag>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
}
