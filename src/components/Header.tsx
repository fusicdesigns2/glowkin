
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Header() {
  const { user, profile, signOut } = useAuth();
  
  return (
    <header className="w-full py-4 px-6 bg-[#403E43] text-white border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-white"
          onClick={() => document.documentElement.classList.toggle('hide-sidebar')}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Mai Mai</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <div className="bg-maiFunFactBg text-maiDarkText px-3 py-1 rounded-full text-sm">
              <span className="font-semibold">{profile?.credits}</span> credits
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative rounded-full h-8 w-8 p-0">
                  <Avatar>
                    <AvatarFallback className="bg-maiBlue text-white">
                      {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem className="flex justify-between">
                  Credits <span className="font-semibold">{profile?.credits}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = "/dashboard"}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/buy-credits"}>
                  Buy Credits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/usage"}>
                  Usage Report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => window.location.href = "/login"}>
              Log in
            </Button>
            <Button className="bg-maiRed hover:bg-red-600" onClick={() => window.location.href = "/register"}>
              Sign up
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
