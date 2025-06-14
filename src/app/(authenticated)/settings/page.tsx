
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { UserCircle, Mail, Briefcase, KeyRound, Bell } from "lucide-react";

export default function SettingsPage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null; // Or a loading state
  }
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>View and update your personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                 <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="profile picture" />
                <AvatarFallback className="text-3xl">{getInitials(currentUser.name)}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">Change Picture</Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={currentUser.name} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue={currentUser.email} disabled />
            </div>
             <div className="space-y-1">
              <Label htmlFor="department">Department</Label>
              <Input id="department" defaultValue={currentUser.department} disabled />
            </div>
            <Button className="w-full">Save Changes</Button>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and account security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <h3 className="font-medium flex items-center"><KeyRound className="w-5 h-5 mr-2 text-primary" /> Password</h3>
                  <p className="text-sm text-muted-foreground">Last changed: 3 months ago</p>
                </div>
                <Button variant="outline">Change Password</Button>
              </div>
              {/* Future: Add 2FA settings here */}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <h3 className="font-medium flex items-center"><Mail className="w-5 h-5 mr-2 text-primary" /> Email Notifications</h3>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
               <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <h3 className="font-medium flex items-center"><Bell className="w-5 h-5 mr-2 text-primary" /> In-App Notifications</h3>
                  <p className="text-sm text-muted-foreground">Show notifications within the app</p>
                </div>
                <Button variant="outline">Manage</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
