"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export function TopNav() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="w-full sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
        <Link href="/" className="font-semibold tracking-tight">
          Ambi
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <form onSubmit={onSearchSubmit} className="flex-1 max-w-xl">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索术语…"
          />
        </form>
        <nav className="flex items-center gap-2 ml-auto">
          <Link href="/upload">
            <Button variant="secondary" size="sm">上传</Button>
          </Link>
          <Link href="/review">
            <Button size="sm">审阅</Button>
          </Link>
          <NotificationsBell />
          <ProfileMenu />
        </nav>
      </div>
    </header>
  );
}

function NotificationsBell() {
  return (
    <Button variant="ghost" size="icon" aria-label="Notifications">
      <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />
      🔔
    </Button>
  );
}

function ProfileMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">个人中心</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/contributions">我的贡献</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">设置</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>登出</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TopNav;


