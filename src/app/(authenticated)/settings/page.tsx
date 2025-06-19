
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  updateUserProfileNameAction, 
  updateUserAvatarAction, 
  updateUserPasswordAction, 
  updateUserNotificationPreferenceAction 
} from '@/lib/client-data-service'; // UPDATED IMPORT
import { UserCircle, Mail, Briefcase, KeyRound, Bell, Loader2, UploadCloud } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."), 
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function SettingsPage() {
  const { currentUser, isLoading: authLoading, reloadCurrentUser } = useAuth();
  const { toast } = useToast();
  const [isSavingName, setIsSavingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '', // Will be set by useEffect
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({ name: currentUser.name });
    }
  }, [currentUser, profileForm]);

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const handleProfileSave: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!currentUser) return;
    setIsSavingName(true);
    const success = await updateUserProfileNameAction(currentUser.id, data.name);
    if (success) {
      toast({ title: "Profile Updated", description: "Your name has been successfully updated." });
      await reloadCurrentUser(); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update your name." });
    }
    setIsSavingName(false);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePictureFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const file = event.target.files?.[0];
    if (!file) return;

    toast({ title: "Picture Selected (Simulation)", description: `File "${file.name}" was chosen. Avatar will update with a new placeholder.` });

    const currentPicNumber = currentUser.avatarUrl?.match(/(\d+)x\1/)?.[1];
    const nextSize = currentPicNumber === '100' ? '150' : currentPicNumber === '150' ? '200' : '100';
    const newAvatarUrl = `https://placehold.co/${nextSize}x${nextSize}.png`;
    
    const success = await updateUserAvatarAction(currentUser.id, newAvatarUrl);
    if (success) {
      toast({ title: "Picture Updated", description: "Your profile picture has been changed (using a placeholder)." });
      await reloadCurrentUser();
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update picture." });
    }
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  const handlePasswordChangeSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    if (!currentUser) return;
    setIsChangingPassword(true);
    const success = await updateUserPasswordAction(currentUser.id);
    if (success) {
      toast({ title: "Password Updated", description: "Your password has been successfully changed." });
      await reloadCurrentUser();
      setShowPasswordDialog(false);
      passwordForm.reset();
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update password. (Demo: No actual password check)" });
    }
    setIsChangingPassword(false);
  };
  
  const handleNotificationToggle = async (preferenceType: 'email' | 'inApp', value: boolean) => {
    if (!currentUser) return;
    const success = await updateUserNotificationPreferenceAction(currentUser.id, preferenceType, value);
    if (success) {
      toast({ title: "Preference Updated", description: `${preferenceType === 'email' ? 'Email' : 'In-app'} notification preference saved.` });
      await reloadCurrentUser();
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not save preference." });
    }
  };

  return (
    <div className="space-y-8 p-1 md:p-2">
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
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24" key={currentUser.avatarUrl}>
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="profile picture user" />
                    <AvatarFallback className="text-3xl">{getInitials(currentUser.name)}</AvatarFallback>
                  </Avatar>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePictureFileSelected} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <Button variant="outline" size="sm" type="button" onClick={triggerFileInput}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Change Picture
                  </Button>
                </div>
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="name">Full Name</FormLabel>
                      <FormControl>
                        <Input id="name" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={currentUser.email} disabled className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={currentUser.department} disabled className="text-sm" />
                </div>
                <Button type="submit" className="w-full" disabled={isSavingName}>
                  {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>
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
                  <p className="text-sm text-muted-foreground">
                    Last changed: {currentUser.passwordLastChanged 
                      ? `${formatDistanceToNow(currentUser.passwordLastChanged, { addSuffix: true })}` 
                      : 'Never'}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>Change Password</Button>
              </div>
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
                <Switch 
                  checked={!!currentUser.prefersEmailNotifications}
                  onCheckedChange={(checked) => handleNotificationToggle('email', checked)}
                  aria-label="Toggle email notifications"
                />
              </div>
               <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <h3 className="font-medium flex items-center"><Bell className="w-5 h-5 mr-2 text-primary" /> In-App Notifications</h3>
                  <p className="text-sm text-muted-foreground">Show notifications within the app</p>
                </div>
                 <Switch 
                  checked={!!currentUser.prefersInAppNotifications}
                  onCheckedChange={(checked) => handleNotificationToggle('inApp', checked)}
                  aria-label="Toggle in-app notifications"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your account password. For demo purposes, current password is not checked.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordChangeSubmit)} className="space-y-4 pt-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
