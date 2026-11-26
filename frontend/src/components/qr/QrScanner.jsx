import { useEffect, useId, useRef, useState } from 'react'
import {
  Html5Qrcode,
  Html5QrcodeScanType,
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'

function QrScanner({ enabled, onDecode }) {
  const scannerId = useId().replace(/:/g, '')
  const imageScannerId = `${scannerId}-image`
  const callbackRef = useRef(onDecode)
  const [cameraError, setCameraError] = useState('')
  const [isReadingImage, setIsReadingImage] = useState(false)

  useEffect(() => {
    callbackRef.current = onDecode
  }, [onDecode])

  useEffect(() => {
    if (!enabled) return undefined

    setCameraError('')
    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 8,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        qrbox: { width: 230, height: 230 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
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

  async function decodeImage(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setCameraError('')
    setIsReadingImage(true)
    let scanner
    try {
      scanner = new Html5Qrcode(imageScannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      })
      const { decodedText } = await scanner.scanFileV2(file, false)
      callbackRef.current(decodedText)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        message.includes('NotFoundException') ||
        message.includes('No MultiFormat Readers were able to detect the code')
      ) {
        setCameraError(
          'No readable QR code found. Choose a clear, uncropped route-ticket QR image or enter the token manually.',
        )
      } else {
        setCameraError(`Could not read the QR image: ${message}`)
      }
    } finally {
      scanner?.clear()
      input.value = ''
      setIsReadingImage(false)
    }
  }

  if (!enabled) return null

  return (
    <div className="scanner-panel">
      {cameraError ? <p className="notice notice-warning" role="alert">{cameraError}</p> : null}
      <div id={scannerId} aria-label="Camera QR scanner" />
      <label className="workspace-field-label">
        Upload route QR image
        <input
          accept="image/*"
          className="workspace-input"
          disabled={isReadingImage}
          onChange={decodeImage}
          type="file"
        />
      </label>
      {isReadingImage ? <p role="status">Reading QR image…</p> : null}
      <div aria-hidden="true" hidden id={imageScannerId} />
    </div>
  )
}

export default QrScanner
