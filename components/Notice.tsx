const INK = '#141414';

export default function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '48px 16px' }}>
      <div
        style={{
          background: '#fff',
          border: `3px solid ${INK}`,
          borderRadius: 20,
          boxShadow: `6px 6px 0 ${INK}`,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 42 }}>🤔</div>
        <h1 style={{ fontFamily: "'Archivo Black', system-ui, sans-serif", fontSize: 22, margin: '10px 0' }}>{title}</h1>
        <p style={{ fontWeight: 600, margin: 0 }}>{body}</p>
      </div>
    </main>
  );
}
