"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";

export default function UserMenu({
  userId,
  name,
  email,
  isAdmin,
}: {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center"
      >
        <Avatar name={name} size={38} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-60 overflow-hidden rounded-2xl border border-ink/5 bg-white py-2 shadow-lg">
          <div className="border-b border-ink/5 px-4 py-2.5">
            <div className="truncate font-display font-semibold">{name}</div>
            <div className="truncate text-xs text-fog">{email}</div>
          </div>
          <MenuLink href="/library" onClick={() => setOpen(false)}>
            library
          </MenuLink>
          <MenuLink href="/dashboard" onClick={() => setOpen(false)}>
            dashboard
          </MenuLink>
          <MenuLink href={`/profile/${userId}`} onClick={() => setOpen(false)}>
            my profile
          </MenuLink>
          {isAdmin && (
            <MenuLink href="/dashboard/admin" onClick={() => setOpen(false)}>
              admin
            </MenuLink>
          )}
          <form action="/auth/signout" method="post" className="border-t border-ink/5">
            <button className="w-full px-4 py-2.5 text-left text-sm lowercase text-fog hover:bg-mist hover:text-ink">
              log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2.5 text-sm lowercase hover:bg-mist"
    >
      {children}
    </Link>
  );
}
