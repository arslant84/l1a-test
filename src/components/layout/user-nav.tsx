

"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, UserCircle, Bell, CheckCircle, XCircle, Info, Edit, AlertTriangle, FileText, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { AppNotification, AppNotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: AppNotificationType) => {
  switch (type) {
    case 'request_submitted':
    case 'request_updated':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'request_approved_step':
    case 'request_fully_approved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'request_rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'request_cancelled':
      return <Info className="h-4 w-4 text-gray-500" />;
    case 'request_processed_cm':
      return <CheckCheck className="h-4 w-4 text-purple-500" />;
    case 'action_required':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};


export function UserNav() {
  const { 
    currentUser, logout, 
    notifications, unreadNotificationCount, 
    markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications 
  } = useAuth();
  const router = useRouter();

  if (!currentUser) {
    return null; 
  }

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };
  
  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
  };
  
  // Display max 5 recent notifications
  const recentNotifications = notifications.slice(0, 5);


  return (
    <div className="flex items-center gap-2">
      <DropdownMenu onOpenChange={(open) => { if(open) fetchNotifications(); }}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 md:w-96" align="end">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadNotificationCount > 0 && <Badge variant="secondary">{unreadNotificationCount} New</Badge>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
              No new notifications
            </DropdownMenuItem>
          ) : (
            <ScrollArea className="h-[250px] sm:h-[300px]">
              {recentNotifications.map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  onSelect={(e) => { e.preventDefault(); handleNotificationClick(notif);}}
                  className={cn(
                    "flex items-start gap-3 py-2.5 px-3 cursor-pointer hover:bg-muted/50",
                    !notif.isRead && "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-medium leading-tight break-words", !notif.isRead && "font-semibold")}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground break-words mt-0.5">
                      {notif.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary self-center ml-2 shrink-0" title="Unread"></div>
                  )}
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleMarkAllRead} disabled={unreadNotificationCount === 0}>
            Mark all as read
          </DropdownMenuItem>
          {/* Placeholder for "View All Notifications" page */}
          {/* <DropdownMenuItem onSelect={() => router.push('/notifications')}>View all notifications</DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-9 w-9" key={currentUser.avatarUrl}>
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="user avatar" />
              <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

