import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";

export default function WorkerDashboard() {
  return (
    <div>
      <PageHeader eyebrow="Visitor desk" title="Create a tour" action={<Link className="button button-primary" to="/worker/register">Register visitor</Link>} />
      <div className="card card-body">
        <p className="page-description">Register an anonymous visitor, collect preferences and generate a timed museum route.</p>
      </div>
    </div>
  );
}