import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Header.css";

const Header = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetch("http://localhost:5000/api/current-user", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user || null))
      .catch((err) => {
        console.error(err);
        setUser(null);
      });
  }, [location]);

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    window.location.href = "/";
  };

  const onLoginPage = location.pathname === "/login";
  const onSignUpPage = location.pathname === "/signin";

  return (
    <header className="header">
      <div className="brand">
        <Link to="/">EasyRent</Link>
      </div>
      <nav>
        {user ? (
          <div className="user-dropdown">
            <span
              className="dropdown-toggle"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Hi, {user.full_name} ▼
            </span>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <Link className="profile-rent" to="/profile" onClick={() => setDropdownOpen(false)}>
                  Profile
                </Link>
                <Link className="profile-rent" to="/rent-history" onClick={() => setDropdownOpen(false)}>
                  Rent History
                </Link>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {!onLoginPage && <Link to="/login">Login</Link>}
            {!onSignUpPage && <Link to="/signin">Sign Up</Link>}
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
