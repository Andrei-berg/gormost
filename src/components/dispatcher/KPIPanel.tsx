interface KPIData {
  total: number
  new: number
  inProgress: number
  problems: number
  done: number
}

export default function KPIPanel({ data }: { data: KPIData }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    }}>
      <KPICard title="Всего заявок" value={data.total} color="#3b82f6" />
      <KPICard title="Новых" value={data.new} color="#eab308" />
      <KPICard title="В работе" value={data.inProgress} color="#8b5cf6" />
      <KPICard title="Проблемы" value={data.problems} color="#ef4444" />
      <KPICard title="Выполнено" value={data.done} color="#22c55e" />
    </div>
  )
}

function KPICard({ title, value, color }: { title: string, value: number, color: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
      border: `1px solid ${color}40`,
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '36px',
        fontWeight: 'bold',
        color: color,
        textShadow: `0 0 20px ${color}60`
      }}>
        {value}
      </div>
    </div>
  )
}
