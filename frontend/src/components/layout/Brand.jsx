import { Link } from "react-router-dom";

export default function Brand({ to = "/", compact = false }) {
  return (
    <Link className={`brand ${compact ? "brand-compact" : ""}`} to={to} aria-label="Aakāर home">
      <span className="brand-mark" aria-hidden="true">आ</span>
      <span>Aakāर</span>
    </Link>
  );
}
