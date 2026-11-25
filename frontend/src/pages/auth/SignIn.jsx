import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/layout/Brand";
import { useAuth } from "../../context/AuthContext";

export default function SignIn() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [role, setRole] = useState("curator");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login({ ...form, role });
      navigate(role === "worker" ? "/worker" : "/curator");
    } catch (reason) {
      setError(reason.message);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card card card-body">
        <Brand to="/" />
        <header className="page-header" style={{ marginTop: 24 }}>
          <div>
            <p className="eyebrow">Aakāर access</p>
            <h1>Sign in</h1>
          </div>
        </header>
        <div className="auth-role-switch" role="group" aria-label="Choose account type">
          <button
            className={`auth-role-button ${role === "curator" ? "is-selected" : ""}`}
            type="button"
            aria-pressed={role === "curator"}
            onClick={() => { setRole("curator"); setError(""); }}
          >
            Curator
          </button>
          <button
            className={`auth-role-button ${role === "worker" ? "is-selected" : ""}`}
            type="button"
            aria-pressed={role === "worker"}
            onClick={() => { setRole("worker"); setError(""); }}
          >
            Worker
          </button>
        </div>
        <form className="field-grid" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={update} />
          </div>
          {error && <p role="alert" style={{ color: "var(--error)", margin: 0 }}>{error}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {role === "curator" && (
          <p className="auth-signup-link">
            Create new Account.{" "}
            <Link to="/auth/sign-up">SignUp</Link>
          </p>
        )}
      </div>
    </main>
  );
}
