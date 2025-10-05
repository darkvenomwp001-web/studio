
'use client';

import { useEffect, useState, useMemo, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, Users, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User as AppUser } from '@/types';
import { updateUserRole, deleteUserPermanently } from '@/app/actions/userActions';
import { useToast } from '@/hooks/use-toast';

const ADMIN_USERNAME = "authorrafaelnv";

function UserRow({ user, adminId, onUserDeleted }: { user: AppUser, adminId: string, onUserDeleted: (userId: string) => void }) {
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, startDeleteTransition] = useTransition();

    const handleRoleChange = async (newRole: 'reader' | 'writer') => {
        if (newRole === user.role) return;
        setIsUpdating(true);
        const result = await updateUserRole(adminId, user.id, newRole);
        if (result.success) {
            toast({ title: 'Success', description: `${user.displayName}'s role updated to ${newRole}.` });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsUpdating(false);
    };

    const handleDelete = () => {
        startDeleteTransition(async () => {
            const result = await deleteUserPermanently(adminId, user.id);
            if (result.success) {
                toast({ title: 'User Deleted', description: `${user.displayName} has been removed.` });
                onUserDeleted(user.id);
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };
    
    return (
        <TableRow>
            <TableCell>{user.displayName || user.username}</TableCell>
            <TableCell className="hidden md:table-cell">{user.email}</TableCell>
            <TableCell>
                {user.username === ADMIN_USERNAME ? (
                     <Select defaultValue={user.role || 'writer'} disabled>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="writer">Writer</SelectItem></SelectContent>
                    </Select>
                ) : isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Select defaultValue={user.role || 'reader'} onValueChange={handleRoleChange}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="reader">Reader</SelectItem>
                            <SelectItem value="writer">Writer</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </TableCell>
             <TableCell className="text-right">
                {user.username !== ADMIN_USERNAME && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </AlertDialogTrigger>
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
                )}
            </TableCell>
        </TableRow>
    );
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
    
    const handleUserDeleted = (deletedUserId: string) => {
        setAllUsers(prev => prev.filter(u => u.id !== deletedUserId));
    };

    if (loading || !user || user.username !== ADMIN_USERNAME) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <header>
                <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
                    <Shield className="h-10 w-10" />
                    Admin Dashboard
                </h1>
                <p className="text-muted-foreground">Manage users and platform settings.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><Users className="h-5 w-5" /> User Management</span>
                        <div className="relative w-full max-w-sm">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input 
                                placeholder="Search users..." 
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                             />
                        </div>
                    </CardTitle>
                    <CardDescription>View and manage user roles.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingUsers ? (
                         <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="hidden md:table-cell">Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map(u => <UserRow key={u.id} user={u} adminId={user.id} onUserDeleted={handleUserDeleted} />)}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
