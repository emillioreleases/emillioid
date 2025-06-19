import { Button } from "~/components/ui/button";
import { authClient } from "~/utils/auth-client";

export function Logout() {
  return <Button onClick={() => authClient.signOut()}>Logout</Button>;
}