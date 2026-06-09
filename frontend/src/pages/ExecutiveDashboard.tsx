import { useEffect, useState, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { TreeSelect, Spin, Tag } from 'antd';
import { useResponsive } from '../hooks/useResponsive';
import { BoltIcon, SuccessIcon, BarChartIcon, WarningIcon, WrenchIcon, TrophyIcon, RobotIcon, SpinnerIcon, ArrowUpIcon, ArrowDownIcon, PauseIcon, CrossIcon, STATUS_ICONS } from '../components/Icons';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  // ── 企业层级选择 ──
  const [orgTree, setOrgTree] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [trendData, setTrendData] = useState<any>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  const faultChartDomRef = useRef<HTMLDivElement>(null);
  const faultChartRef = useRef<echarts.ECharts | null>(null);

  // Fetch main dashboard data
  useEffect(() => {
    fetch('/api/dashboard/executive')
      .then(r => r.json())
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch org tree for selector
  useEffect(() => {
    fetch('/api/organizations/tree')
      .then(r => r.json())
      .then(res => setOrgTree(res.data || []))
      .catch(() => {});
  }, []);

  // Org tree field mappings for TreeSelect
  const treeFieldNames = { label: 'name', value: 'id', children: 'children' };

  // Fetch OEE trend for selected org
  const fetchTrend = useCallback(async (orgId?: string) => {
    setTrendLoading(true);
    try {
      const params = orgId ? `?orgId=${orgId}` : '';
      const res = await fetch(`/api/dashboard/oee-trend${params}`);
      const json = await res.json();
      setTrendData(json.data);
    } catch {
      // fallback to main data
      setTrendData(null);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  // Load initial trend (no org filter = 全厂)
  useEffect(() => {
    fetchTrend(undefined);
  }, [fetchTrend]);

  const handleOrgChange = (value: string | undefined) => {
    setSelectedOrgId(value);
    fetchTrend(value);
    // Scale trend chart axis if needed
    if (faultChartRef.current) {
      faultChartRef.current.resize();
    }
  };

  // Use org trend data if available, otherwise fallback to main data
  const oeeTrend = trendData?.trend || data?.dailyOEETrend || data?.monthlyOEETrend || [];
  const trendOrgName = trendData?.orgName || '全厂';
  const currentOEE = trendData?.currentOEE ?? data?.currentOEE;
  const prevOEE = trendData?.prevOEE ?? data?.prevOEE;

  // Init pie chart — mount once only
  useEffect(() => {
    if (!faultChartDomRef.current) return;
    faultChartRef.current = echarts.init(faultChartDomRef.current);
    return () => {
      faultChartRef.current?.dispose();
      faultChartRef.current = null;
    };
  }, []);

  // Update pie chart when data or chart instance changes
  useEffect(() => {
    const chart = faultChartRef.current;
    if (!chart || !data?.faultTypeDistribution) return;
    const colors = ['#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#F97316'];
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
      legend: {
        orient: 'vertical', right: 10, top: 'center',
        textStyle: { fontSize: 12 },
        itemWidth: 10, itemHeight: 10,
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
        },
        data: data.faultTypeDistribution.map((f: any, idx: number) => ({
          value: f.count,
          name: f.type,
          itemStyle: { color: colors[idx % colors.length] },
        })),
      }],
    });
  }, [data?.faultTypeDistribution]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}><SpinnerIcon size={18} style={{ marginRight: 6 }} />加载中...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无数据</div>;

  const oeeUp = (currentOEE ?? 0) >= (prevOEE ?? 0);

  return (
    <div style={{ padding: isMobile ? 8 : 16, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* ═══ KPI 卡片行 ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 140 : 180}px, 1fr))`, gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 16 }}>
        {/* KPI: OEE */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>当前 OEE <Tag style={{ fontSize: 10, borderRadius: 4, border: 'none', lineHeight: '16px' }}>{trendOrgName}</Tag></div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {oeeUp
              ? <ArrowUpIcon size={18} color="#22C55E" />
              : <ArrowDownIcon size={18} color="#EF4444" />
            }
            <span style={{ fontSize: 28, fontWeight: 700, color: '#3B82F6' }}>{currentOEE}</span>
            <span style={{ fontSize: 14, color: '#999' }}>%</span>
          </div>
          <div style={{ fontSize: 11, color: oeeUp ? '#22C55E' : '#EF4444', marginTop: 2 }}>
            {oeeUp ? `较上期 +${((currentOEE ?? 0) - (prevOEE ?? 0)).toFixed(1)}%` : `较上期 ${((currentOEE ?? 0) - (prevOEE ?? 0)).toFixed(1)}%`}
          </div>
        </div>

        {/* KPI: 设备总数 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>设备总数 / 运行率</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>{data.totalDevices}</span>
            <span style={{ fontSize: 14, color: '#999' }}>台</span>
          </div>
          <div style={{ fontSize: 11, color: '#22C55E', marginTop: 2 }}>{data.runningCount} 台运行中 · {data.runningRate}%</div>
        </div>

        {/* KPI: 健康度 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>平均健康度</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: data.avgHealth >= 75 ? '#22C55E' : data.avgHealth >= 60 ? '#F59E0B' : '#EF4444' }}>{data.avgHealth}</span>
            <span style={{ fontSize: 14, color: '#999' }}>分</span>
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>优秀 {data.healthDistribution?.[0]?.count || 0} · 较差 {data.healthDistribution?.[3]?.count || 0}</div>
        </div>

        {/* KPI: 待处理工单 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>待处理工单</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: data.woPending > 10 ? '#EF4444' : '#F59E0B' }}>{data.woPending}</span>
            <span style={{ fontSize: 14, color: '#999' }}>个</span>
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>完成率 {data.woCompletionRate}% · 共 {data.woTotal} 个</div>
        </div>

        {/* KPI: 维保成本 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>本月维保成本</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>¥{data.latestCost?.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 11, color: '#22C55E', marginTop: 2 }}>较年初持续下降</div>
        </div>
      </div>

      {/* ═══ OEE 30日趋势 — 竖柱状图 + 目标线 ═══ */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 12 : 16, marginBottom: isMobile ? 12 : 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', margin: 0 }}><BoltIcon size={16} color="#F59E0B" style={{ marginRight: 4 }} /> OEE 30日趋势</h3>
          <TreeSelect
            placeholder="选择企业层级"
            allowClear
            showSearch
            treeDefaultExpandAll
            treeNodeFilterProp="name"
            value={selectedOrgId}
            onChange={handleOrgChange}
            style={{ minWidth: isMobile ? 140 : 220 }}
            size="small"
            treeData={orgTree}
            fieldNames={treeFieldNames}
          />
        </div>
        {trendLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <Spin size="small" style={{ marginRight: 8 }} />加载趋势...
          </div>
        )}
        {!trendLoading && oeeTrend.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无趋势数据</div>
        )}
        {!trendLoading && oeeTrend.length > 0 && (<>
        <div style={{ display: 'flex', gap: 8, height: 220, position: 'relative' }}>
          {/* Y轴刻度 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 30, flexShrink: 0, paddingBottom: 28 }}>
            <span style={{ fontSize: 10, color: '#999' }}>100</span>
            <span style={{ fontSize: 10, color: '#999' }}>85</span>
            <span style={{ fontSize: 10, color: '#999' }}>60</span>
            <span style={{ fontSize: 10, color: '#999' }}>40</span>
            <span style={{ fontSize: 10, color: '#999' }}>20</span>
            <span style={{ fontSize: 10, color: '#999' }}>0</span>
          </div>

          {/* 图表 */}
          <div style={{ flex: 1, position: 'relative', paddingBottom: 28, overflowX: 'auto' }}>
            {/* 目标线 (85%) */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: `${100 - 85}%`,
              borderTop: '2px dashed #EF4444', zIndex: 1,
            }} />
            <span style={{
              position: 'absolute', right: 0, top: `${100 - 85}%`, transform: 'translateY(-100%)',
              fontSize: 10, color: '#EF4444', fontWeight: 600, background: '#fff', paddingRight: 4, zIndex: 2,
            }}>目标 85%</span>

            {/* 柱状图 — 30天每日数据 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%', position: 'relative', minWidth: isMobile ? 400 : 600 }}>
              {oeeTrend.map((t: any, idx: number) => {
                const oee = Math.min(100, Math.max(0, t.oee));
                const barColor = oee >= 85 ? '#22C55E' : oee >= 70 ? '#3B82F6' : '#F59E0B';
                const isLast = idx === (oeeTrend.length - 1);
                const showLabel = idx % 5 === 0 || isLast;
                return (
                  <div key={t.date || t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    {/* 柱体 */}
                    <div style={{
                      width: '100%', height: `${oee}%`,
                      background: `linear-gradient(180deg, ${barColor}, ${barColor}99)`,
                      borderRadius: '2px 2px 0 0',
                      position: 'relative',
                      transition: 'height 0.3s',
                      minHeight: oee > 0 ? 2 : 0,
                    }}>
                      {/* 数值标注（仅首尾和突出点） */}
                      {isLast && (
                        <span style={{
                          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                          fontSize: 9, fontWeight: 600, color: barColor, whiteSpace: 'nowrap',
                        }}>{t.oee}%</span>
                      )}
                    </div>
                    {/* X轴标签（每5天显示） */}
                    {showLabel && (
                      <span style={{ fontSize: 9, color: '#999', marginTop: 3, whiteSpace: 'nowrap' }}>
                        {(t.date || t.month || '').slice(5)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 网格线 */}
            {[0, 20, 40, 60, 80, 100].map(v => (
              <div key={v} style={{
                position: 'absolute', left: 0, right: 0, top: `${100 - v}%`,
                borderTop: '1px solid #f0f0f0', pointerEvents: 'none',
              }} />
            ))}
          </div>
        </div>
        </>)}
      </div>

      {/* ═══ 健康度分布 + 状态分布 + 工单趋势 + 故障类型 ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 240 : 280}px, 1fr))`, gap: isMobile ? 8 : 12, marginBottom: isMobile ? 8 : 16 }}>
        {/* 健康度分布 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 12 : 16 }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><SuccessIcon size={16} style={{ marginRight: 4 }} /> 设备健康度分布</h3>
          {(['优秀 (90-100)', '良好 (75-89)', '一般 (60-74)', '较差 (<60)']).map((label, idx) => {
            const h = (data.healthDistribution || []).find((x: any) => x.label === label);
            if (!h) return null;
            const barColors = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444'];
            return (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 2 }}>
                  <span>{h.label}</span>
                  <span style={{ fontWeight: 600, color: barColors[idx] }}>{h.count}台 ({h.percentage}%)</span>
                </div>
                <div style={{ height: 10, background: '#f5f5f5', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${h.percentage}%`, height: '100%', background: barColors[idx], borderRadius: 5 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 设备状态分布 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 12 : 16 }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><BarChartIcon size={16} color="#3B82F6" style={{ marginRight: 4 }} /> 设备状态分布</h3>
          {(data.deviceStatusDistribution || []).map((s: any) => {
            const colorMap: Record<string, string> = { running: '#22C55E', idle: '#999', fault: '#EF4444', maintenance: '#F59E0B', repair: '#F97316' };
            const c = colorMap[s.key] || '#999';
            const pct = data.totalDevices > 0 ? Math.round((s.count / data.totalDevices) * 100) : 0;
            const StatusIcon = STATUS_ICONS[s.key];
            return (
              <div key={s.key} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {StatusIcon ? <StatusIcon size={12} color={c} /> : null}
                  {s.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 12, background: '#f5f5f5', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 6 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: c, minWidth: 30, textAlign: 'right' }}>{s.count}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 工单月度趋势 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 12 : 16 }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><WarningIcon size={16} color="#F59E0B" style={{ marginRight: 4 }} /> 工单月度趋势</h3>
          {(data.woMonthlyTrend || []).map((t: any) => {
            const total = t.total || 0;
            const completed = t.completed || 0;
            const pct = total > 0 ? (completed / total) * 100 : 0;
            return (
              <div key={t.month} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 36, fontSize: 10, color: '#999' }}>{t.month.slice(5)}</span>
                <div style={{ flex: 1, display: 'flex', height: 16, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ flex: 1, background: '#91caff', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#333' }}>{total}</span>
                  </div>
                  {total > 0 && (
                    <div style={{ flex: 1, height: `${Math.max(pct, 5)}%`, background: '#22C55E', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 8, color: '#fff', fontWeight: 600 }}>{completed}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 10, color: '#999', marginTop: 4 }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#91caff', borderRadius: 2, marginRight: 4 }} />总数</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#22C55E', borderRadius: 2, marginRight: 4 }} />已完成</span>
          </div>
        </div>

        {/* 故障类型分布 — 饼图 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 12 : 16 }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><WrenchIcon size={16} color="#EF4444" style={{ marginRight: 4 }} /> 故障类型分布</h3>
          <div ref={faultChartDomRef} style={{ width: '100%', height: isMobile ? 200 : 250 }} />
        </div>

        {/* 设备健康度 Top 10 (简版) */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 12 : 16 }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><TrophyIcon size={16} style={{ marginRight: 4 }} /> 设备健康度 Top 10</h3>
          {(data.topHealthyDevices || []).slice(0, 5).map((item: any, idx: number) => (
            <div key={item.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < 4 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: 10, background: idx < 3 ? '#F59E0B' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: idx < 3 ? '#fff' : '#999' }}>{idx + 1}</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{item.name}</span>
                  <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>{item.code}</span>
                </div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: item.healthScore >= 90 ? '#22C55E' : item.healthScore >= 75 ? '#3B82F6' : '#F59E0B' }}>{item.healthScore}</span>
            </div>
          ))}
        </div>

        {/* 改善 ROI (简版) */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 12 : 16 }}>
          <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><RobotIcon size={16} style={{ marginRight: 4 }} /> 改善活动 ROI 分析</h3>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: '#999' }}>项目</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: '#999' }}>投入</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: '#999' }}>年节省</th>
                <th style={{ textAlign: 'center', padding: '4px 8px', color: '#999' }}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {(data.improvementROI || []).map((p: any) => (
                <tr key={p.project} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{p.project}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>¥{p.investment.toLocaleString()}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>¥{p.saving.toLocaleString()}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}><span style={{ background: '#22C55E', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{p.roi}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(() => {
            const totalInv = (data.improvementROI || []).reduce((s: number, p: any) => s + p.investment, 0);
            const totalSav = (data.improvementROI || []).reduce((s: number, p: any) => s + p.saving, 0);
            return (
              <div style={{ marginTop: 8, fontSize: 11, color: '#999', textAlign: 'right' }}>
                总投入: <strong style={{ color: '#333' }}>¥{totalInv.toLocaleString()}</strong> · 总节省: <strong style={{ color: '#22C55E' }}>¥{totalSav.toLocaleString()}</strong>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
