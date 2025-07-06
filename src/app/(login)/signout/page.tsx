import { Button } from "~/components/ui/button";
import LoginTemplate from "../signin/login-template";

export default function SignOutPage() {
  return (
    <LoginTemplate
      title="Would you like to be signed out globally?"
      description="You are being signed out from the app you just came from. Would you like to be signed out from all other apps?"
    >
      <div className="space-x-2">
        <Button className="w-[50%]">No</Button>
        <Button>Yes</Button>
      </div>
    </LoginTemplate>
  );
}
