import PageHeader from "../../components/common/PageHeader";
import DataView from "../../components/common/DataView";
import { analyticsService } from "../../services/analyticsService";

export default function CuratorDashboard() {
  return (
    <div>
      <PageHeader eyebrow="Curator overview" title="Dashboard" />
      <DataView
        loader={() => analyticsService.dashboard()}
        emptyTitle="No analytics available"
        emptyMessage="Recorded visitor activity will appear here."
        render={(data) => {
          const metrics = [
            ["Tours started", data?.tourStarts],
            ["Tours completed", data?.tourCompletions],
            ["Exhibit scans", data?.exhibitScans],
            ["Completed exhibits", data?.exhibitCompletions],
          ];
          return (
            <div className="metric-grid">
              {metrics.map(([label, value]) => (
                <article className="card card-body metric" key={label}>
                  <p className="field-help">{label}</p>
                  <strong className="metric-value">{typeof value === "number" ? value : "—"}</strong>
                </article>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}