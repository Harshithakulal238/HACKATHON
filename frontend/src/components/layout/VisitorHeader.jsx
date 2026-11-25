import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Brand from "./Brand";

export default function VisitorHeader({ back = false }) {
  const navigate = useNavigate();
  return (
    <header className="visitor-header">
      {back ? (
        <button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <span />
      )}
      <Brand compact />
      <span className="header-spacer" />
    </header>
  );
}
