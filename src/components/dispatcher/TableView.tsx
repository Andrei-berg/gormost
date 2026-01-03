const SERVICE_COLORS: any = {
  'SRV-STR': '#8b5cf6',
  'SRV-ENG': '#eab308',
  'SRV-FIRE': '#ef4444',
  'SRV-VENT': '#06b6d4',
  'SRV-CCTV': '#22c55e'
}

const STATUS_COLORS: any = {
  'NEW': '#eab308',
  'PLANNED': '#3b82f6',
  'IN_PROGRESS': '#8b5cf6',
  'CHECKING': '#f97316',
  'DONE': '#22c55e'
}

export default function TableView({ requests }: any) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr style={{
              background: 'rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Th>Заявка</Th>
              <Th>Служба</Th>
              <Th>Статус</Th>
              <Th>Место</Th>
              <Th>Работа</Th>
              <Th>Приоритет</Th>
              <Th>Факт старт</Th>
              <Th>Факт финиш</Th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={8} style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '14px'
                }}>
                  Нет заявок
                </td>
              </tr>
            ) : (
              requests.map((req: any, idx: number) => {
                const isProblem = !req.fact_finish && req.status !== 'DONE'
                const serviceColor = SERVICE_COLORS[req.service_id] || '#64748b'
                const statusColor = STATUS_COLORS[req.status] || '#64748b'

                return (
                  <tr
                    key={req.request_id}
                    style={{
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Td>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: isProblem ? '#ef4444' : 'rgba(255,255,255,0.8)'
                      }}>
                        {isProblem && '🔴 '}
                        {req.request_id}
                      </div>
                    </Td>

                    <Td>
                      <span style={{
                        background: `${serviceColor}30`,
                        border: `1px solid ${serviceColor}50`,
                        color: serviceColor,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {req.service_id?.replace('SRV-', '')}
                      </span>
                    </Td>

                    <Td>
                      <span style={{
                        background: `${statusColor}30`,
                        border: `1px solid ${statusColor}50`,
                        color: statusColor,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {req.status}
                      </span>
                    </Td>

                    <Td>
                      <div style={{ color: 'white', fontSize: '13px' }}>
                        {req.location_text}
                      </div>
                    </Td>

                    <Td>
                      <div style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '12px',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {req.work_description}
                      </div>
                    </Td>

                    <Td>
                      {req.priority ? (
                        <span style={{
                          background: 'rgba(234,179,8,0.2)',
                          border: '1px solid rgba(234,179,8,0.3)',
                          color: '#eab308',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          ⚡ {req.priority}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                      )}
                    </Td>

                    <Td>
                      {req.fact_start ? (
                        <div style={{
                          color: '#22c55e',
                          fontSize: '12px'
                        }}>
                          {formatDateTime(req.fact_start)}
                        </div>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                      )}
                    </Td>

                    <Td>
                      {req.fact_finish ? (
                        <div style={{
                          color: '#22c55e',
                          fontSize: '12px'
                        }}>
                          {formatDateTime(req.fact_finish)}
                        </div>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                      )}
                    </Td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: any) {
  return (
    <th style={{
      padding: '15px 12px',
      textAlign: 'left',
      color: 'rgba(255,255,255,0.6)',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {children}
    </th>
  )
}

function Td({ children }: any) {
  return (
    <td style={{
      padding: '15px 12px',
      color: 'rgba(255,255,255,0.8)',
      fontSize: '13px'
    }}>
      {children}
    </td>
  )
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month} ${hours}:${minutes}`
}
