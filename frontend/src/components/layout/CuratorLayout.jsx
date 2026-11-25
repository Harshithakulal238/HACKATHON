import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Brand from "./Brand";

const links = [
  ["Overview", "/curator"],
  ["Museums", "/curator/museum"],
  ["Galleries", "/curator/galleries"],
  ["Exhibits", "/curator/exhibits"],
  ["Floor plan", "/curator/floorplan"],
  ["QR codes", "/curator/qr"],
  ["Analytics", "/curator/analytics"],
];

export default function CuratorLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="curator-shell">
      <aside className={`curator-sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <Brand to="/curator" />
          <button className="icon-button sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Curator navigation">
          {links.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === "/curator"} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <main className="curator-main">
        <header className="curator-mobile-header">
          <button className="icon-button" type="button" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <Brand to="/curator" compact />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
