import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const TABS = ["Play", "Characters", "Card", "Backpack", "Shop", "Setting"];

export default function NavBar({ selected, onChange }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      // ignore
    }
    navigate("/", { replace: true });
  };

  return (
    <nav className="nav-bar">
      <div className="nav-bar__left">
        <ul className="nav-bar__list">
          {TABS.map((t) => (
            <li key={t} className={`nav-bar__item ${selected === t ? "nav-bar__item--active" : ""}`}>
              <button onClick={() => onChange(t)} className="nav-bar__button">
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="nav-bar__right">
        <button className="nav-bar__logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
