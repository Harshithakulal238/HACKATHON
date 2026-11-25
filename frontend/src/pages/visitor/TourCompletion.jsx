import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { sessionService } from "../../services/sessionService";

export default function TourCompletion() {
  const { sessionId } = useParams();
  const [status, setStatus] = useState("");
  const finish = async () => {
    if (!sessionId) { setStatus("A valid tour session is required."); return; }
    try { await sessionService.complete(sessionId); setStatus("Tour completed."); }
    catch (error) { setStatus(error.message); }
  };
  return (
    <div>
      <PageHeader eyebrow="Tour status" title="Your museum visit" />
      <div className="state state-empty">
        <h2>{status === "Tour completed." ? "Tour completed" : "Finish this tour"}</h2>
        <p>{status === "Tour completed." ? "Thank you for visiting." : "Complete the active session when you are ready to finish."}</p>
        {status !== "Tour completed." ? <button className="button button-primary" type="button" onClick={finish}>Finish tour</button> : <Link className="button button-secondary" to="/">Return home</Link>}
        {status && status !== "Tour completed." && <p role="alert" style={{ color: "var(--error)" }}>{status}</p>}
      </div>
    </div>
  );
}