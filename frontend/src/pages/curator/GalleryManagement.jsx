import PageHeader from "../../components/common/PageHeader";
import DataView from "../../components/common/DataView";
import { apiRequest } from "../../services/api";

export default function GalleryManagement() {
  return (
    <div>
      <PageHeader eyebrow="Content" title="Galleries" />
      <DataView
        loader={() => apiRequest("/galleries")}
        emptyTitle="No galleries available"
        emptyMessage="Published galleries will appear here."
        render={(data) => {
          const galleries = Array.isArray(data) ? data : data?.items || data?.data || [];
          return <div className="list">{galleries.map((gallery) => <article className="card list-card" key={gallery.id}><div className="thumbnail image-fallback">Gallery</div><div><h2>{gallery.name}</h2><p>{gallery.description || ""}</p></div></article>)}</div>;
        }}
      />
    </div>
  );
}