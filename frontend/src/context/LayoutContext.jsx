import { createContext, useContext, useState, useEffect } from "react";

const LayoutContext = createContext();

export function LayoutProvider({ children }) {
  const [layoutMode, setLayoutMode] = useState(localStorage.getItem("rs_layout_mode") || "auto"); // "auto", "mobile", "desktop"

  useEffect(() => {
    localStorage.setItem("rs_layout_mode", layoutMode);
    document.body.classList.remove("force-mobile-mode", "force-desktop-mode");
    
    if (layoutMode === "mobile") {
      document.body.classList.add("force-mobile-mode");
    } else if (layoutMode === "desktop") {
      document.body.classList.add("force-desktop-mode");
    }
  }, [layoutMode]);

  return (
    <LayoutContext.Provider value={{ layoutMode, setLayoutMode }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
