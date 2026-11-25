import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { sessionService } from "../../services/sessionService";

export default function SessionExtension() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState(10);
  const [status, setStatus] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!sessionId) { setStatus("A valid tour session is required."); return; }
    try {
      await sessionService.extend(sessionId, minutes);
      navigate(`/visitor/tour/${sessionId}`);
    } catch (error) { setStatus(error.message); }
  };
  return (
    <form onSubmit={submit}>
      <PageHeader eyebrow="Session time" title="Extend your visit" />
      <div className="choice-grid">
        {[10, 20].map((option) => (
          <button key={option} type="button" className={`choice ${minutes === option ? "is-selected" : ""}`} onClick={() => setMinutes(option)}>{option} minutes</button>
        ))}
      </div>
      {status && <p role="alert" style={{ color: "var(--error)" }}>{status}</p>}
      <div className="bottom-action"><div className="bottom-action-inner"><button className="button button-primary button-full" type="submit">Apply extension</button></div></div>
    </form>
  );
}