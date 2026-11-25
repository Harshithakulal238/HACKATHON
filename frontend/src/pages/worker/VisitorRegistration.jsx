import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { sessionService } from "../../services/sessionService";

export default function VisitorRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ language: "en" });
  const [status, setStatus] = useState("");
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    try {
      const result = await sessionService.registerVisitor(form);
      navigate(`/worker/interests/${result?.visitorId || result?.id}`);
    } catch (error) { setStatus(error.message); }
  };
  return (
    <form onSubmit={submit}>
      <PageHeader eyebrow="Step 1" title="Visitor registration" />
      <div className="field-grid">
        <div className="field">
          <label htmlFor="language">Preferred language</label>
          <select id="language" name="language" value={form.language} onChange={update}>
            <option value="en">English</option>
            <option value="kn">Kannada</option>
          </select>
        </div>
      </div>
      {status && <p role="alert" style={{ color: "var(--error)" }}>{status}</p>}
      <div className="bottom-action"><div className="bottom-action-inner"><button className="button button-primary button-full" type="submit">Continue</button></div></div>
    </form>
  );
}