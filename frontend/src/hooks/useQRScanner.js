import { useState } from "react";

export function useQRScanner(onResult) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const reportResult = (value) => {
    if (!value) {
      setStatus("error");
      setError("No QR code value was detected.");
      return;
    }
    setStatus("success");
    setError("");
    onResult(value);
  };

  return { status, error, reportResult, setStatus, setError };
}