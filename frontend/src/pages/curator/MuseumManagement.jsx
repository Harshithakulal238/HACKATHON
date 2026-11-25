import PageHeader from "../../components/common/PageHeader";
import DataView from "../../components/common/DataView";
import { apiRequest } from "../../services/api";

export default function MuseumManagement() {
  return (
    <div>
      <PageHeader eyebrow="Content" title="Museums" />
      <DataView
        loader={() => apiRequest("/museums")}
        emptyTitle="No museums configured"
        emptyMessage="Create a museum record before adding galleries and exhibits."
        render={(data) => {
          const museums = Array.isArray(data) ? data : data?.items || data?.data || [];
          return <div className="list">{museums.map((museum) => <article className="card card-body" key={museum.id}><h2>{museum.name}</h2>{museum.location && <p className="field-help">{museum.location}</p>}</article>)}</div>;
        }}
      />
    </div>
  );
}