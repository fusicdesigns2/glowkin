import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, FileText, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
export default function Header() {
  const {
    user,
    profile,
    signOut
  } = useAuth();
  return <header className="w-full py-4 px-6 bg-[#403E43] text-white border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => document.documentElement.classList.toggle('hide-sidebar')}>
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Mai Mai</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {user ? <>
            <Link to="/pdf-upload">
              <Button variant="outline" className="flex items-center hover:bg-blue-600 border-blue-500 text-gray-950">
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF
              </Button>
            </Link>
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
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/buy-credits">Buy Credits</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/usage">Usage Report</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Content Gather</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/pdf-upload" className="flex items-center">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDF
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pdf-list" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      My PDFs
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </> : <div className="flex space-x-2">
            <Link to="/pdf-upload">
              <Button variant="outline" className="flex items-center hover:bg-blue-600 border-blue-500 text-white">
                <Upload className="mr-2 h-4 w-4" />
                Try PDF Upload
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.location.href = "/login"}>
              Log in
            </Button>
            <Button className="bg-maiRed hover:bg-red-600" onClick={() => window.location.href = "/register"}>
              Sign up
            </Button>
          </div>}
      </div>
    </header>;
}