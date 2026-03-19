import { Link, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { isStaff } from "@judge/shared";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | "system"
      | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
      return;
    }
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold">
              emjudge
            </Link>
            {user && (
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  to="/classes"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  班級
                </Link>
                {isStaff(user.role) && (
                  <Link
                    to="/admin"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    管理
                  </Link>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setTheme((prev) =>
                  prev === "dark"
                    ? "light"
                    : prev === "light"
                      ? "system"
                      : "dark",
                )
              }
              aria-label="切換深色模式"
            >
              {theme === "dark" ? "🌑" : theme === "light" ? "☀️" : "💻"}
            </Button>
            {user && (
              <>
                <Link
                  to="/profile"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {user.displayName}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  登出
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
