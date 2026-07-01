"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConnectInstagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextPath: string;
}

export function ConnectInstagramModal({ isOpen, onClose, nextPath }: ConnectInstagramModalProps) {
  const [username, setUsername] = useState("");

  const handleConnect = () => {
    if (!username.trim()) return;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    window.location.href = `/api/auth/instagram?next=${encodeURIComponent(nextPath)}&username=${encodeURIComponent(cleanUsername)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Instagram</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Instagram Username</Label>
            <Input
              id="username"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the exact username of the Instagram account you want to connect.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!username.trim()}>
            Connect Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
