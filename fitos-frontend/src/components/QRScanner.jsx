import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, active }) {
  const ref = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    const scanner = new Html5Qrcode('qr-reader');
    ref.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (text) => {
        if (busyRef.current) return;
        busyRef.current = true;
        onScan(text).finally(() => setTimeout(() => (busyRef.current = false), 2000));
      },
      () => {}
    ).catch((e) => console.error('QR start failed:', e));

    return () => { scanner.stop().catch(() => {}); };
  }, [active]);

  return <div id="qr-reader" className="rounded-xl overflow-hidden border border-gd-border max-w-sm mx-auto" />;
}
