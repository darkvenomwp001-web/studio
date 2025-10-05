
'use client';

import { useEffect, useState, useMemo, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, Users, Search, Trash2, UserX, UserCheck, MoreVertical, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User as AppUser } from '@/types';
import { updateUserRole, deleteUserPermanently, banUser } from '@/app/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ADMIN_USERNAME = "authorrafaelnv";

function UserRowActions({ user, adminId, onUserAction }: { user: AppUser, adminId: string, onUserAction: () => void }) {
    const { toast } = useToast();
    const [isProcessing, startTransition] = useTransition();

    const handleRoleChange = (newRole: 'reader' | 'writer' | 'moderator') => {
        if (newRole === user.role) return;
        startTransition(async () => {
            const result = await updateUserRole(adminId, user.id, newRole);
            if (result.success) {
                toast({ title: 'Success', description: `${user.displayName}'s role updated to ${newRole}.` });
                onUserAction();
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };
    
    const handleBanToggle = () => {
        startTransition(async () => {
            const result = await banUser(adminId, user.id, !user.isBanned);
            if (result.success) {
                toast({ title: 'Success', description: `${user.displayName} has been ${!user.isBanned ? 'banned' : 'unbanned'}.` });
                onUserAction();
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteUserPermanently(adminId, user.id);
            if (result.success) {
                toast({ title: 'User Deleted', description: `${user.displayName} has been removed permanently.` });
                onUserAction();
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };

    if (user.username === ADMIN_USERNAME) return null;

    return (
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleRoleChange('reader')} disabled={user.role === 'reader'}>Reader</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleRoleChange('writer')} disabled={user.role === 'writer'}>Writer</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleRoleChange('moderator')} disabled={user.role === 'moderator'}>Moderator</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleBanToggle} className={cn(user.isBanned && "text-green-600 focus:text-green-600")}>
                        {user.isBanned ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                        {user.isBanned ? 'Unban User' : 'Ban User'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {user.displayName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action is permanent and cannot be undone. This will permanently delete the user account and remove their data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                        Delete User
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function UserMobileCard({ user, adminId, onUserAction }: { user: AppUser, adminId: string, onUserAction: () => void }) {
    const roleBadgeVariant = (role: string | undefined) => {
        switch(role) {
            case 'writer': return 'default';
            case 'moderator': return 'secondary';
            case 'banned': return 'destructive';
            default: return 'outline';
        }
    }
    
    return (
        <Card className="animate-fade-in">
            <CardContent className="p-4 flex items-start gap-4">
                 <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={user.avatarUrl} alt={user.displayName} data-ai-hint="profile person" />
                    <AvatarFallback>{(user.displayName || user.username).charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <h3 className="font-semibold">{user.displayName}</h3>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                     <div className="flex items-center gap-2 pt-1">
                         <Badge variant={roleBadgeVariant(user.role)} className="capitalize text-xs">{user.role || 'reader'}</Badge>
                         {user.isBanned && <Badge variant="destructive" className="capitalize text-xs">Banned</Badge>}
                     </div>
                </div>
                <UserRowActions user={user} adminId={adminId} onUserAction={onUserAction} />
            </CardContent>
        </Card>
    )
}

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (loading) return;
        if (!user || user.username !== ADMIN_USERNAME) {
            router.push('/');
            return;
        }

        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
            setAllUsers(usersData);
            setIsLoadingUsers(false);
        });

        return () => unsubscribe();

    }, [user, loading, router]);
    
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return allUsers;
        return allUsers.filter(u => 
            u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allUsers, searchTerm]);
    
    // This function will be passed down to force a re-render of user list if data changes,
    // though onSnapshot should handle this. It's a good-to-have for specific actions.
    const handleUserAction = () => {
        // Since onSnapshot is active, we don't need to manually refetch.
        // This function's existence is enough to pass down for triggering actions.
    };

    if (loading || !user || user.username !== ADMIN_USERNAME) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            <header className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary flex items-center gap-3">
                    <Shield className="h-8 w-8 sm:h-10 sm:w-10" />
                    Admin Dashboard
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground">Manage users and platform settings.</p>
            </header>

            <Card className="shadow-lg animate-fade-in">
                <CardHeader>
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <span className="flex items-center gap-2"><Users className="h-5 w-5" /> User Management</span>
                        <div className="relative w-full sm:max-w-xs">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input 
                                placeholder="Search users..." 
                                className="pl-10 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                             />
                        </div>
                    </CardTitle>
                    <CardDescription>View, manage roles, and moderate user accounts.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingUsers ? (
                         <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/></div>
                    ) : (
                        <>
                        {/* Mobile View */}
                        <div className="space-y-4 md:hidden">
                            {filteredUsers.map(u => <UserMobileCard key={u.id} user={u} adminId={user.id} onUserAction={handleUserAction} />)}
                        </div>
                        
                        {/* Desktop View */}
                        <div className="hidden md:block">
                            <div className="border rounded-lg">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-background divide-y divide-border">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <Avatar>
                                                                <AvatarImage src={u.avatarUrl} alt={u.displayName} data-ai-hint="profile person" />
                                                                <AvatarFallback>{(u.displayName || u.username).charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-foreground">{u.displayName}</div>
                                                            <div className="text-sm text-muted-foreground">@{u.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{u.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant={u.role === 'writer' ? 'default' : 'secondary'} className="capitalize">{u.role || 'reader'}</Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {u.isBanned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="outline" className="text-green-600 border-green-400">Active</Badge>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <UserRowActions user={u} adminId={user.id} onUserAction={handleUserAction} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    