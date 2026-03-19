import { Link } from "react-router";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(30,64,175,0.25),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute right-[-120px] top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.22),transparent_70%)] blur-2xl" />

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 py-20 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
          Playwright 驅動的自動評測
        </div>
        <h1 className="animate-fade-up delay-1 text-4xl font-semibold tracking-tight sm:text-5xl">
          emjudge
        </h1>
        <p className="animate-fade-up delay-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
          前端作業繳交與自動評測平台。上傳你的 HTML / CSS / JS 或 React 作業，
          系統會自動執行 Playwright 測試並產出分數、截圖與評測報告。
        </p>
        <div className="animate-fade-up delay-3 flex flex-wrap items-center justify-center gap-3">
          {isAuthenticated ? (
            <Button asChild>
              <Link to="/classes">進入班級</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">登入</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/classes">查看班級</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 pb-16 md:grid-cols-3">
        {[
          {
            title: "上傳即測",
            desc: "拖放或選擇作業檔案，系統即時開始排隊與執行測試。",
          },
          {
            title: "截圖回饋",
            desc: "Playwright 自動產出多尺寸截圖，快速對照設計成果。",
          },
          {
            title: "清楚評分",
            desc: "測試報告與錯誤訊息一目了然，協助學生快速修正。",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1"
          >
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-emerald-400/70 to-blue-500/70 opacity-80" />
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl pb-12">
        <div className="rounded-3xl border border-border bg-card px-6 py-8 text-left shadow-sm md:flex md:items-center md:justify-between">
          <div className="max-w-lg">
            <h2 className="text-2xl font-semibold">一站式作業管理</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              從班級建立、測試模板到成績回饋，全流程集中管理。
            </p>
          </div>
          <div className="mt-4 flex gap-3 md:mt-0">
            <Button variant="secondary" asChild>
              <Link to="/classes">開始使用</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/login">教師登入</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
