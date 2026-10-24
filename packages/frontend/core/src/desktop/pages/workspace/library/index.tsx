import React from 'react';

export const Component = () => {
  return (
    <div
      style={{
        padding: '28px 36px',
        maxWidth: 1280,
        margin: '0 auto',
        minHeight: '100vh',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span>📚</span> Biblioteca & Lector Anx
      </h1>
      <p style={{ margin: '6px 0 24px', fontSize: 14, opacity: 0.7 }}>
        Estantería de libros local y lector inmersivo Foliate-js integrado sin
        dependencias de WebDAV.
      </p>
    </div>
  );
};
