import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/StatusState";
import PageHeader from "../../components/common/PageHeader";
import ImageWithFallback from "../../components/common/ImageWithFallback";
import { exhibitService } from "../../services/exhibitService";

export default function ExhibitDetails() {
  const { exhibitId } = useParams();
  const [exhibit, setExhibit] = useState(null);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    let active = true;
    exhibitService.get(exhibitId).then((data) => active && setExhibit(data?.exhibit || data)).catch((reason) => active && setError(reason));
    return () => { active = false; };
  }, [exhibitId]);

  if (error) return <ErrorState error={error} />;
  if (!exhibit) return <LoadingState label="Loading exhibit" />;

  const story = exhibit.stories?.[language] || exhibit.story || "";
  return (
    <article>
      <ImageWithFallback src={exhibit.imageUrl || exhibit.image} alt={exhibit.name || exhibit.title || ""} className="exhibit-image" fallbackLabel="Exhibit image unavailable" />
      <PageHeader eyebrow={exhibit.categoryName || exhibit.category || ""} title={exhibit.name || exhibit.title || "Exhibit"} />
      <div className="field" style={{ marginBottom: 18 }}>
        <label htmlFor="story-language">Language</label>
        <select id="story-language" value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="en">English</option>
          <option value="kn">Kannada</option>
        </select>
      </div>
      {story ? <p style={{ lineHeight: 1.85, fontSize: 17 }}>{story}</p> : <EmptyState title="Story unavailable" message="This language does not have a published story." />}
      <div className="bottom-action">
        <div className="bottom-action-inner" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link className="button button-secondary" to={`/visitor/audio/${exhibitId}`}>Audio guide</Link>
          <Link className="button button-primary" to={`/visitor/feedback/${exhibitId}`}>Continue</Link>
        </div>
      </div>
    </article>
  );
}