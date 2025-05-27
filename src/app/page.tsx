'use client';

import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    videoTitle: '',
    description: '',
    topic: '',
    avatarId: ''
  });

  const [status, setStatus] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Enviando...');

    try {
      const res = await fetch('/api/send-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success || result.rawHtml) {
        setStatus('¡Formulario enviado con éxito!');
        setFormData({ videoTitle: '', description: '', topic: '', avatarId: '' });
      } else {
        setStatus('Error al enviar: ' + JSON.stringify(result));
      }
    } catch (error: any) {
      setStatus('Error al conectar con el servidor: ' + error.message);
    }
  };

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Enviar idea de video</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="videoTitle"
          placeholder="Título del video"
          value={formData.videoTitle}
          onChange={handleChange}
          required
        /><br /><br />

        <textarea
          name="description"
          placeholder="Descripción del video"
          value={formData.description}
          onChange={handleChange}
          required
        /><br /><br />

        <input
          name="topic"
          placeholder="Temática del video"
          value={formData.topic}
          onChange={handleChange}
          required
        /><br /><br />

        <input
          name="avatarId"
          placeholder="Avatar ID"
          value={formData.avatarId}
          onChange={handleChange}
          required
        /><br /><br />

        <button type="submit">Enviar</button>
      </form>

      {status && <p style={{ marginTop: 20 }}>{status}</p>}
    </main>
  );
}
