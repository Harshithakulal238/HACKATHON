import { useEffect, useId, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

function QrScanner({ enabled, onDecode }) {
  const scannerId = useId().replace(/:/g, '')
  const callbackRef = useRef(onDecode)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    callbackRef.current = onDecode
  }, [onDecode])

  useEffect(() => {
    if (!enabled) return undefined

    setCameraError('')
    const scanner = new Html5QrcodeScanner(
      scannerId,
      { fps: 8, qrbox: { width: 230, height: 230 } },
      false,
    )
    scanner.render(
      (decodedText) => callbackRef.current(decodedText),
      (errorMessage) => {
        if (
          String(errorMessage).includes('NotAllowedError') ||
          String(errorMessage).includes('NotReadableError')
        ) {
          setCameraError('Camera access is unavailable. Use the code-entry field instead.')
        }
      },
    )

    return () => {
      scanner.clear().catch((error) => {
        console.error('Could not stop the QR scanner cleanly:', error)
      })
    }
  }, [enabled, scannerId])

  if (!enabled) return null

  return (
    <div className="scanner-panel">
      {cameraError ? <p className="notice notice-warning">{cameraError}</p> : null}
      <div id={scannerId} aria-label="Camera QR scanner" />
    </div>
  )
}

export default QrScanner
