import { useEffect, useState, type AnchorHTMLAttributes } from "react";

export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const on = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return path.split("?")[0];
}

export async function navigate(to: string) {
  const [path, hash] = to.split("#");
  if (path && path !== window.location.pathname + window.location.search) {
    const pending:Promise<boolean>[]=[];if (!window.dispatchEvent(new CustomEvent("story:before-navigate",{cancelable:true,detail:{pending}}))) return;if(pending.length&&!(await Promise.all(pending)).every(Boolean))return;
    window.history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0 });
  }
  if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
