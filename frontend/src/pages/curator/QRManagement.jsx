import PageHeader from "../../components/common/PageHeader";
import DataView from "../../components/common/DataView";
import { qrService } from "../../services/qrService";

export default function QRManagement() {
  return (
    <div>
      <PageHeader eyebrow="Museum codes" title="QR management" />
      <DataView
        loader={() => qrService.list()}
        emptyTitle="No QR codes configured"
        emptyMessage="Generated exhibit and route codes will appear here."
        render={(data) => {
          const codes = Array.isArray(data) ? data : data?.items || data?.data || [];
          return <div className="list">{codes.map((code) => <article className="card list-card" key={code.id}><div className="thumbnail image-fallback">QR</div><div><h2>{code.label || code.name || "QR code"}</h2><p>{code.type || ""}</p></div></article>)}</div>;
        }}
      />
    </div>
  );
}