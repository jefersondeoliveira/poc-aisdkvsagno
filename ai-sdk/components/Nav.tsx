import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/compare", label: "Compare" },
  { href: "/chat", label: "Chat (AI SDK)" },
  { href: "/voice", label: "Voice + text" },
  { href: "/docs", label: "Full comparison" },
];

export function Nav() {
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        <strong>POC</strong>
        {links.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
      </div>
    </nav>
  );
}
