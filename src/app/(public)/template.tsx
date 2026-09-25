/**
 * Re-mounts on every navigation, so each page fades in over 200 ms.
 * Plain CSS on purpose: a JavaScript-driven fade starts at opacity 0 in
 * the server HTML, which would hide the page until hydration. The CSS
 * animation runs without JavaScript and is off for reduced motion.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
