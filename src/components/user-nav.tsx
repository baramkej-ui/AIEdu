"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { signOut, updateProfile, updatePassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { getLoginHistory } from "@/lib/data";
import type { LoginRecord } from "@/lib/types";
import { useRouter } from "next/navigation";
import { LogOut, User, Loader, History, DoorOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.password && data.password.length < 6) return false;
    return true;
}, {
    message: "Password must be at least 6 characters.",
    path: ["password"],
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
});


type DialogState = 'closed' | 'profile' | 'loginHistory';

export function UserNav() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<DialogState>('closed');
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);


  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.displayName || "",
      password: "",
      confirmPassword: "",
    },
  });
  
  useEffect(() => {
    if (user) {
        form.reset({
            name: user.displayName || "",
            password: "",
            confirmPassword: "",
        })
    }
  }, [user, form]);


  useEffect(() => {
    if (dialogOpen === 'loginHistory' && user) {
        setIsHistoryLoading(true);
        getLoginHistory(user.uid)
            .then(history => {
                setLoginHistory(history);
            })
            .finally(() => {
                setIsHistoryLoading(false);
            });
    }
  }, [dialogOpen, user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };
  
  const handleProfileUpdate = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    setIsUpdating(true);

    try {
        // Update display name if it has changed
        if (values.name !== user.displayName) {
            await updateProfile(user, { displayName: values.name });
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { name: values.name });
            toast({
                title: "Success",
                description: "Your name has been updated.",
            });
        }

        // Update password if it's provided
        if (values.password) {
            await updatePassword(user, values.password);
            toast({
                title: "Success",
                description: "Your password has been updated.",
            });
        }
        
        form.reset({
            name: values.name,
            password: "",
            confirmPassword: "",
        });
        setDialogOpen('closed');
        router.refresh(); 

    } catch (error: any) {
        console.error("Error updating profile: ", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: `Could not update your profile. ${error.message}`,
        });
    } finally {
        setIsUpdating(false);
    }
  }

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "U";
    const name = user?.displayName;
    if (name) {
      const parts = name.split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm font-medium sm:block">
          {user?.displayName || "Teacher"}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL ?? ""} alt="User avatar" />
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.displayName || "Teacher"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setDialogOpen('profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setDialogOpen('loginHistory')}>
                    <History className="mr-2 h-4 w-4" />
                    <span>LogIn Record</span>
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
      
      {/* Profile Edit Dialog */}
      <Dialog open={dialogOpen === 'profile'} onOpenChange={(isOpen) => !isOpen && setDialogOpen('closed')}>
         <DialogContent>
            <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
                Make changes to your profile here. Click save when you're done.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Leave blank to keep current password" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Confirm your new password" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Login History Dialog */}
      <Dialog open={dialogOpen === 'loginHistory'} onOpenChange={(isOpen) => !isOpen && setDialogOpen('closed')}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Login History</DialogTitle>
                <DialogDescription>
                    Here is a list of your recent login times.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-72">
                <div className="p-1">
                {isHistoryLoading ? (
                     <div className="space-y-3">
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-5 w-4/5" />
                    </div>
                ) : loginHistory.length > 0 ? (
                    <ul className="space-y-3">
                        {loginHistory.map((record) => (
                           <li key={record.id} className="flex items-center gap-3 text-sm text-muted-foreground">
                                <DoorOpen className="h-4 w-4" />
                                <span>{format(record.timestamp.toDate(), "PPP p")}</span>
                           </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-10">No login history found.</p>
                )}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
