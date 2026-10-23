import { useEffect, useRef, useState } from 'react';

export default function VoiceRecorder({ value, onChange }) {
  const [state, setState] = useState(value ? 'done' : 'idle');
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!value) { setState('idle'); setPreviewUrl(''); }
  }, [value]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setPreviewUrl(URL.createObjectURL(blob));
        onChange(blob);
        setState('done');
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setSecs(0);
      setState('recording');
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch (e) {
      setError('Microphone is blocked or not available. Allow microphone access and use https or localhost.');
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    recRef.current?.stop();
  };

  const discard = () => {
    setPreviewUrl('');
    setState('idle');
    onChange(null);
  };

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <div className="voice">
      {state === 'idle' && (
        <button type="button" className="btn ghost" onClick={start}>● Record voice message</button>
      )}
      {state === 'recording' && (
        <div className="row">
          <span className="rec-dot" aria-hidden="true" />
          <strong>{mmss}</strong>
          <button type="button" className="btn danger" onClick={stop}>Stop</button>
        </div>
      )}
      {state === 'done' && (
        <div className="row">
          {previewUrl && <audio controls src={previewUrl} />}
          <button type="button" className="btn ghost" onClick={discard}>Remove</button>
        </div>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}
