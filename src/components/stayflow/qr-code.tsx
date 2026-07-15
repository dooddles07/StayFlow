import * as React from 'react'
import QRCode from 'qrcode'

export function QrCode({ value, size = 168, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#0a0a1a', light: '#ffffff' } }).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!src) {
    return <div className={className} style={{ width: size, height: size }} />
  }

  return <img src={src} alt="QR pass code" width={size} height={size} className={className} />
}
