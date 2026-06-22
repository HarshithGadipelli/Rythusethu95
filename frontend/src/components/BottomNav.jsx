import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, User, Bot, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./BottomNav.css";

export default function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // Determine role-based links
  const getLinks = () => {
    const baseLinks = [
      { path: "/", icon: <Home size={24} />, label: "Home" }
    ];

    if (!user) {
      baseLinks.push({ path: "/marketplace", icon: <ShoppingBag size={24} />, label: "Market" });
      baseLinks.push({ path: "/login", icon: <User size={24} />, label: "Login" });
      return baseLinks;
    }

    if (user.role === "admin") {
      baseLinks.push({ path: "/admin", icon: <Package size={24} />, label: "Admin" });
    } else if (user.role === "farmer") {
      baseLinks.push({ path: "/farmer", icon: <Package size={24} />, label: "Dashboard" });
    } else if (user.role === "agent") {
      baseLinks.push({ path: "/agent", icon: <Package size={24} />, label: "Deliveries" });
    } else {
      // Customer
      baseLinks.push({ path: "/marketplace", icon: <ShoppingBag size={24} />, label: "Market" });
      baseLinks.push({ path: "/ai", icon: <Bot size={24} />, label: "AI Guide" });
    }

    // Common Profile link
    baseLinks.push({ path: "/profile", icon: <User size={24} />, label: "Profile" });

    return baseLinks;
  };

  const links = getLinks();

  return (
    <div className="bottom-nav">
      {links.map((link) => {
        const isActive = pathname === link.path || (link.path !== "/" && pathname.startsWith(link.path));
        return (
          <Link key={link.path} to={link.path} className={`bottom-nav-item ${isActive ? "active" : ""}`}>
            <div className="bottom-nav-icon">{link.icon}</div>
            <span className="bottom-nav-label">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
