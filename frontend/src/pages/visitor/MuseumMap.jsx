import PageHeader from "../../components/common/PageHeader";

export default function MuseumMap() {
  return (
    <div>
      <PageHeader eyebrow="Navigation" title="Museum map" />
      <div className="card" style={{ minHeight: 420, padding: 16 }}>
        <svg role="img" aria-label="Museum floor plan" viewBox="0 0 600 420" style={{ width: "100%", height: "auto" }}>
          <rect x="1" y="1" width="598" height="418" rx="12" fill="#F7F0E5" stroke="#D8C5A5" />
        </svg>
      </div>
      <p className="field-help" style={{ marginTop: 12 }}>The floor plan will be provided by museum route data.</p>
    </div>
  );
}