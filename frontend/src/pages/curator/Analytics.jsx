import PageHeader from "../../components/common/PageHeader";
import DataView from "../../components/common/DataView";
import { analyticsService } from "../../services/analyticsService";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Analytics() {
  return (
    <div>
      <PageHeader eyebrow="Recorded activity" title="Analytics" />
      <DataView
        loader={() => analyticsService.dashboard()}
        emptyTitle="No analytics available"
        emptyMessage="Recorded events will be shown when the backend provides analytics."
        render={(data) => {
          const chartData = Array.isArray(data?.exhibitEngagement) ? data.exhibitEngagement : [];
          return chartData.length ? (
            <section className="card card-body" style={{ minHeight: 360 }}>
              <h2>Exhibit engagement</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#722F37" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          ) : (
            <div className="state state-empty"><h2>No chart data available</h2><p>The API returned no exhibit engagement records.</p></div>
          );
        }}
      />
    </div>
  );
}