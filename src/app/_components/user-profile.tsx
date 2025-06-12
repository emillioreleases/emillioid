import { LucideUserCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/server";

export default async function UserProfile() {
  let user;
  try {
    user = await api.info.details();
  } catch {
    user = null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          {user ? (
            <>
              <AvatarImage
                src={user.image ?? ""}
                alt={`${user.name}'s avatar`}
              />
              <AvatarFallback>
                {user.name
                  .split(" ")
                  .map((s) => s.charAt(0))
                  .join("")}
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarFallback>
                <LucideUserCircle />
              </AvatarFallback>
            </>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {user ? (
          <>
            <DropdownMenuLabel>
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage
                    src={user.image ?? ""}
                    alt={`${user.name}'s avatar`}
                  />
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((s) => s.charAt(0))
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span className="font-bold">{user.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem>Login</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
