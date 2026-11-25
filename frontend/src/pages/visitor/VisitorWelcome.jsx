import { Link } from "react-router-dom";

export default function VisitorWelcome() {
  return (
    <section className="welcome">
      <div className="welcome-panel">
        <p className="eyebrow">Museum companion</p>
        <h1>Explore at your own pace</h1>
        <p>Scan your tour ticket to begin a route prepared for the time you have available.</p>
        <div className="welcome-actions">
          <Link className="button button-primary" to="/visitor/scan">Start with a tour QR</Link>
          <Link className="button button-secondary" to="/auth/sign-in">Curator Sign in</Link>
        </div>
      </div>
    </section>
  );
}
