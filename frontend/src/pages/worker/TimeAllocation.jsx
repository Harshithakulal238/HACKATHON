import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { routeService } from "../../services/routeService";

export default function TimeAllocation() {
  const { visitorId } = useParams();
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState(60);
  const [status, setStatus] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    try {
      const interestIds = JSON.parse(sessionStorage.getItem("aakar_interest_ids") || "[]");
      const result = await routeService.generate({ visitorId, interestIds, availableMinutes: minutes });
      navigate(`/worker/ticket/${result?.sessionId || result?.id}`);
    } catch (error) { setStatus(error.message); }
  };
  return (
    <form onSubmit={submit}>
      <PageHeader eyebrow="Step 3" title="Available visit time" />
      <div className="field">
        <label htmlFor="minutes">Minutes</label>
        <input id="minutes" name="minutes" type="range" min="15" max="240" step="15" className="range" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
        <p className="field-help">{minutes} minutes</p>
      </div>
      {status && <p role="alert" style={{ color: "var(--error)" }}>{status}</p>}
      <div className="bottom-action"><div className="bottom-action-inner"><button className="button button-primary button-full" type="submit">Generate route</button></div></div>
    </form>
  );
}