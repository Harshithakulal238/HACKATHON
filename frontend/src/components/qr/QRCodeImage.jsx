import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

function QRCodeImage({ value, label, size = 220 }) {
  const [image, setImage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setImage('')
    setError('')
    QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: 'M' })
      .then((dataUrl) => {
        if (active) setImage(dataUrl)
      })
      .catch((generationError) => {
        if (active) setError(`QR code could not be generated: ${generationError.message}`)
      })

    return () => {
      active = false
    }
  }, [value, size])

  if (error) {
    return <p className="notice notice-error" role="alert">{error}</p>
  }
  if (!image) {
    return <p className="muted-copy" role="status">Creating QR code…</p>
  }

  return (
    <a className="qr-download" href={image} download="leviosa-qr.png">
      <img src={image} alt={label} width={size} height={size} />
      <span>Download QR code</span>
    </a>
  )
}

export default QRCodeImage
