import { useState } from "react";
import { Link } from "react-router-dom";
import Brand from "../../components/layout/Brand";
import { authService } from "../../services/authService";

const initialForm = {
  fullName: "",
  museumName: "",
  email: "",
  password: "",
};

export default function SignUp() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.register({ ...form, role: "curator" });
      setCreated(true);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card card card-body">
        <Brand to="/" />
        {created ? (
          <section className="auth-result" role="status">
            <p className="eyebrow">Registration complete</p>
            <h1>Account created</h1>
            <p>Your curator account was created successfully.</p>
            <Link className="button button-primary button-full" to="/auth/sign-in">
              Go to sign in
            </Link>
          </section>
        ) : (
          <>
            <header className="page-header" style={{ marginTop: 24 }}>
              <div>
                <p className="eyebrow">Curator registration</p>
                <h1>Create an account</h1>
              </div>
            </header>
            <form className="field-grid" onSubmit={submit}>
              <div className="field">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.fullName}
                  onChange={update}
                />
              </div>
              <div className="field">
                <label htmlFor="museumName">Name of the place / heritage site / museum</label>
                <input
                  id="museumName"
                  name="museumName"
                  type="text"
                  autoComplete="organization"
                  required
                  value={form.museumName}
                  onChange={update}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={update}
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={update}
                />
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
            <p className="auth-signup-link">
              Already have an account? <Link to="/auth/sign-in">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
