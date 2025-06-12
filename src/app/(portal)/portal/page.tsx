import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { api } from "~/trpc/server";

export default async function Portal() {
  const user = await api.info.details();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-muted-foreground text-sm">Hey there!</span>
          <h2 className="font-bold text-4xl">
            {user.name ?? "Guest"}
          </h2>
        </div>
        <Avatar className="border w-20 h-20">
          <AvatarImage src={user.image ?? ""} alt={`${user.name}'s avatar`} />
          <AvatarFallback>
            {user.name
              .split(" ")
              .map((s) => s.charAt(0))
              .join("")}
          </AvatarFallback>
        </Avatar>
      </div>
      <div>
        {"We don't have any apps to display yet, check back later!"}
      </div>
    </div>
  );
}