import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { apiRequest } from "../../services/api";

export default function Feedback() {
  const { exhibitId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    try {
      await apiRequest("/feedback", { method: "POST", body: JSON.stringify({ exhibitId, rating, comment }) });
      navigate(-1);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <PageHeader eyebrow="Exhibit feedback" title="How was this stop?" />
      <fieldset style={{ border: 0, padding: 0, marginBottom: 18 }}>
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>Rating</legend>
        <div className="choice-grid">
          {["Liked", "Not understood"].map((option) => (
            <button key={option} type="button" className={`choice ${rating === option ? "is-selected" : ""}`} onClick={() => setRating(option)}>{option}</button>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="comment">Additional feedback <span className="field-help">(optional)</span></label>
        <textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} />
      </div>
      {status && <p role="alert" style={{ color: "var(--error)" }}>{status}</p>}
      <div className="bottom-action">
        <div className="bottom-action-inner">
          <button className="button button-primary button-full" type="submit" disabled={!rating}>Submit feedback</button>
        </div>
      </div>
    </form>
  );
}