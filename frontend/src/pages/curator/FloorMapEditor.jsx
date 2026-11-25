import PageHeader from "../../components/common/PageHeader";

export default function FloorMapEditor() {
  return (
    <div>
      <PageHeader eyebrow="Museum layout" title="Floor plan" />
      <div className="card" style={{ minHeight: 520, padding: 16 }}>
        <svg role="img" aria-label="Floor plan editing workspace" viewBox="0 0 800 520" style={{ width: "100%", height: "auto" }}>
          <rect x="1" y="1" width="798" height="518" rx="12" fill="#F7F0E5" stroke="#D8C5A5" />
        </svg>
      </div>
      <p className="field-help" style={{ marginTop: 12 }}>Configure exhibit markers and walking paths using museum map data.</p>
    </div>
  );
}