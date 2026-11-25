import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { sessionService } from "../../services/sessionService";

export default function ScanRouteQR() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");

  const start = async (event) => {
    event.preventDefault();
    setStatus("");
    try {
      const result = await sessionService.start(code.trim());
      navigate(`/visitor/tour/${result?.sessionId || result?.id || ""}`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Begin tour" title="Scan the tour QR" description="Camera access is optional. Enter the code printed on the ticket if needed." />
      <div className="qr-frame">
        <div>
          <p>Camera scanner</p>
          <p className="field-help">The scanner is available when the browser has camera permission.</p>
        </div>
      </div>
      <form className="qr-form field-grid" onSubmit={start}>
        <div className="field">
          <label htmlFor="route-code">Tour code</label>
          <input id="route-code" value={code} onChange={(event) => setCode(event.target.value)} required />
        </div>
        {status && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{status}</p>}
        <button className="button button-primary" type="submit" disabled={!code.trim()}>Start tour</button>
      </form>
    </div>
  );
}