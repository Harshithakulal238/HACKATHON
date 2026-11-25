import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { exhibitService } from "../../services/exhibitService";

export default function AudioGuide() {
  const { exhibitId } = useParams();
  const [exhibit, setExhibit] = useState(null);
  useEffect(() => {
    let active = true;
    exhibitService.get(exhibitId).then((data) => active && setExhibit(data?.exhibit || data));
    return () => { active = false; };
  }, [exhibitId]);

  const audioUrl = exhibit?.audio?.en || exhibit?.audioUrl;
  return (
    <div>
      <PageHeader eyebrow="Audio guide" title={exhibit?.name || exhibit?.title || "Exhibit audio"} />
      {audioUrl ? (
        <audio controls preload="metadata" style={{ width: "100%" }} src={audioUrl}>Your browser does not support audio playback.</audio>
      ) : (
        <div className="state state-empty"><h2>No audio available</h2><p>This exhibit has not published an audio narration.</p></div>
      )}
      <div className="bottom-action">
        <div className="bottom-action-inner">
          <Link className="button button-primary button-full" to={`/visitor/feedback/${exhibitId}`}>Continue</Link>
        </div>
      </div>
    </div>
  );
}