import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { apiRequest } from "../../services/api";
import DataView from "../../components/common/DataView";

export default function InterestSelection() {
  const { visitorId } = useParams();
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const continueToTime = () => sessionStorage.setItem("aakar_interest_ids", JSON.stringify(selected));
  return (
    <div>
      <PageHeader eyebrow="Step 2" title="Choose interests" />
      <DataView
        loader={() => apiRequest("/categories")}
        emptyTitle="No interests configured"
        emptyMessage="A museum curator needs to add exhibit categories first."
        render={(data) => {
          const categories = Array.isArray(data) ? data : data?.items || data?.data || [];
          return (
            <div className="choice-grid">
              {categories.map((category) => (
                <button key={category.id} type="button" className={`choice ${selected.includes(category.id) ? "is-selected" : ""}`} onClick={() => toggle(category.id)}>
                  {category.name}
                </button>
              ))}
            </div>
          );
        }}
      />
      <div className="bottom-action">
        <div className="bottom-action-inner">
          <Link className={`button button-primary button-full`} to={selected.length ? `/worker/time/${visitorId}` : "#"} onClick={(event) => selected.length ? continueToTime() : event.preventDefault()}>
            Continue
          </Link>
        </div>
      </div>
    </div>
  );
}