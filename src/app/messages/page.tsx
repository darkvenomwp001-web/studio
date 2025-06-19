import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { placeholderConversations, placeholderUsers } from '@/lib/placeholder-data';
import { Search, Edit3, Send, Paperclip, Smile } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  // For demo, assume first conversation is active or no conversation is active
  const activeConversation = placeholderConversations[0];
  const currentUser = placeholderUsers[0]; // Mock current user

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] border bg-card rounded-lg shadow-xl overflow-hidden">
      {/* Sidebar with Conversation List */}
      <aside className="w-full md:w-1/3 lg:w-1/4 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-headline font-semibold">Messages</h2>
            <Button variant="ghost" size="icon" className="text-primary">
              <Edit3 className="h-5 w-5" />
              <span className="sr-only">New Message</span>
            </Button>
          </div>
          <div className="relative">
            <Input type="search" placeholder="Search messages..." className="pl-10 bg-background" />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {placeholderConversations.map(conv => {
            const otherParticipant = conv.participants.find(p => p.id !== currentUser.id) || conv.participants[0];
            const isActive = activeConversation && conv.id === activeConversation.id;
            return (
              <Link href={`/messages?convId=${conv.id}`} key={conv.id} scroll={false}>
                <div className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 ${isActive ? 'bg-primary/10 border-l-4 border-primary' : ''}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.username} data-ai-hint="profile person" />
                    <AvatarFallback>{otherParticipant.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <h3 className={`font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{otherParticipant.username}</h3>
                      <span className={`text-xs whitespace-nowrap ${isActive ? 'text-primary/80' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(conv.lastMessage.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${isActive ? 'text-foreground/90' : 'text-muted-foreground'}`}>{conv.lastMessage.content}</p>
                  </div>
                  {conv.unreadCount && conv.unreadCount > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </ScrollArea>
      </aside>

      {/* Main Chat Window */}
      <main className="flex-1 flex flex-col bg-background">
        {activeConversation ? (
          <>
            <header className="p-4 border-b bg-card flex items-center gap-3 shadow-sm">
              <Avatar>
                <AvatarImage src={activeConversation.participants.find(p => p.id !== currentUser.id)?.avatarUrl} alt="User" data-ai-hint="profile person" />
                <AvatarFallback>{activeConversation.participants.find(p => p.id !== currentUser.id)?.username.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{activeConversation.participants.find(p => p.id !== currentUser.id)?.username}</h3>
                <p className="text-xs text-muted-foreground">Online</p> {/* Placeholder status */}
              </div>
            </header>
            
            <ScrollArea className="flex-1 p-4 space-y-4">
              {/* Mock messages */}
              {activeConversation.lastMessage.sender.id !== currentUser.id && (
                <div className="flex items-end gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activeConversation.lastMessage.sender.avatarUrl} data-ai-hint="profile person" />
                    <AvatarFallback>{activeConversation.lastMessage.sender.username.substring(0,2)}</AvatarFallback>
                  </Avatar>
                  <div className="max-w-xs md:max-w-md p-3 rounded-lg rounded-bl-none bg-muted text-foreground shadow">
                    <p className="text-sm">{activeConversation.lastMessage.content}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-right">{formatDistanceToNow(new Date(activeConversation.lastMessage.timestamp), {addSuffix: true})}</p>
                  </div>
                </div>
              )}
               <div className="flex items-end gap-2 justify-end">
                  <div className="max-w-xs md:max-w-md p-3 rounded-lg rounded-br-none bg-primary text-primary-foreground shadow">
                    <p className="text-sm">That sounds great! Let's discuss it further.</p>
                    <p className="text-xs text-primary-foreground/80 mt-1 text-right">{formatDistanceToNow(new Date(Date.now() - 3600000 * 0.5), {addSuffix: true})}</p>
                  </div>
                   <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.avatarUrl} data-ai-hint="profile person" />
                    <AvatarFallback>{currentUser.username.substring(0,2)}</AvatarFallback>
                  </Avatar>
                </div>

            </ScrollArea>

            <footer className="p-4 border-t bg-card">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon"><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                <Input type="text" placeholder="Type a message..." className="flex-1 bg-background focus-visible:ring-primary" />
                <Button className="bg-primary hover:bg-primary/90"><Send className="h-5 w-5" /></Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-24 w-24 text-muted-foreground/50 mb-6" />
            <h2 className="text-2xl font-headline font-semibold mb-2">No Conversation Selected</h2>
            <p className="text-muted-foreground">Select a conversation from the list or start a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
}
