import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import DataView from "../../components/common/DataView";
import ImageWithFallback from "../../components/common/ImageWithFallback";
import { exhibitService } from "../../services/exhibitService";

export default function ExhibitManagement() {
  const [query, setQuery] = useState("");
  return (
    <div>
      <PageHeader eyebrow="Content" title="Exhibits" />
      <div className="toolbar">
        <div className="field search-wrap">
          <label htmlFor="exhibit-search">Search exhibits</label>
          <input id="exhibit-search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      <DataView
        loader={() => exhibitService.list(query ? `?search=${encodeURIComponent(query)}` : "")}
        dependencies={[query]}
        emptyTitle="No exhibits available"
        emptyMessage="Exhibits matching this view will appear here."
        render={(data) => {
          const exhibits = Array.isArray(data) ? data : data?.items || data?.data || [];
          return (
            <div className="list">
              {exhibits.map((exhibit) => (
                <article className="card list-card" key={exhibit.id}>
                  <ImageWithFallback src={exhibit.imageUrl || exhibit.image} alt="" className="thumbnail" />
                  <div><h2>{exhibit.name || exhibit.title}</h2><p>{exhibit.categoryName || exhibit.category || ""}</p></div>
                  <span className="status">{exhibit.status || "Status unavailable"}</span>
                </article>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}