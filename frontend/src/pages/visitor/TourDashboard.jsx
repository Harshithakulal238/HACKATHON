import { Link, useParams } from "react-router-dom";
import DataView from "../../components/common/DataView";
import PageHeader from "../../components/common/PageHeader";
import { routeService } from "../../services/routeService";

export default function TourDashboard() {
  const { sessionId } = useParams();
  return (
    <div>
      <PageHeader eyebrow="Your route" title="Today’s route" action={<Link className="button button-secondary" to={`/visitor/map/${sessionId || ""}`}>View map</Link>} />
      {sessionId ? (
        <DataView
          loader={() => routeService.get(sessionId)}
          emptyTitle="No route is available"
          emptyMessage="The route may not have been generated for this session."
          render={(data) => {
            const stops = data?.stops || data?.route?.stops || [];
            return (
              <div className="list">
                {stops.map((stop, index) => (
                  <article className="card list-card" key={stop.id || stop.exhibitId || index}>
                    <div className="thumbnail image-fallback" role="img" aria-label="Exhibit image unavailable">Exhibit</div>
                    <div>
                      <h2>{stop.exhibitName || stop.name || "Exhibit"}</h2>
                      <p>{stop.categoryName || stop.category || stop.status || ""}</p>
                    </div>
                    <Link className="button button-tertiary" to={`/visitor/exhibit/${stop.exhibitId || stop.id}`}>View</Link>
                  </article>
                ))}
              </div>
            );
          }}
        />
      ) : (
        <div className="state state-empty">
          <h2>Tour session not found</h2>
          <p>Scan the route QR again to retrieve the active session.</p>
          <Link className="button button-primary" to="/visitor/scan">Scan route QR</Link>
        </div>
      )}
    </div>
  );
}