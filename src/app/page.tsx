export default function Home() {
  return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>🚇 Горmost</h1>
      <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px' }}>
        Система управления работами Лефортовского тоннеля
      </p>
      <a 
        href="/test" 
        style={{
          display: 'inline-block',
          padding: '15px 30px',
          background: '#2196f3',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '18px'
        }}
      >
        → Тест подключения к базе
      </a>
    </div>
  )
}
