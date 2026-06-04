"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Lock, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { name: sessionName } = useTenant();
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/tenant/profile").then(res => res.json()),
  });

  React.useEffect(() => {
    if (profileData?.data) {
      setName(profileData.data.name || "");
      setEmail(profileData.data.email || "");
    }
  }, [profileData]);

  const profileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tenant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate({ name, email });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    profileMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h2 className="font-playfair text-2xl font-bold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground/80 mt-1">Manage your account details and security</p>
      </div>

      <form onSubmit={handleProfileSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-4 h-4 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" size="sm" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <form onSubmit={handlePasswordSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-4 h-4 text-primary" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={profileMutation.isPending}>
              Update Password
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Add an extra layer of security to your account by enabling 2FA.
          </p>
          <Button size="sm" variant="outline" disabled>
            Enable 2FA (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
