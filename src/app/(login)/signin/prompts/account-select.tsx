"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { W95Font, W95FontBold } from "~/app/fonts";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { selectAccount } from "~/utils/server-actions";

export function AccountSelectPrompt({ accounts }: { accounts: { accountType: "discord" | "roblox"; accountId: string, display_name: string | null, username: string | null, image: string | null }[] }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [buttonsEnabled, setButtonsEnabled] = useState(true);

    return (
        <div className="flex flex-col w-full gap-2">
            {error && (
                <span className={cn("text-red", W95Font.className)}>
                    {error}
                </span>
            )}
            {accounts.map((account) => (
                <button
                    className="flex w-full border-t-2 border-r-2 border-b-2 border-l-2 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] active:border-t-4 active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
                    onClick={async () => {
                        const result = await selectAccount(account.accountType, account.accountId);
                        if (result.status === "error") {
                            setError(result.message);
                        } else {
                            router.refresh();
                        }
                    }}
                    disabled={!buttonsEnabled}
                >
                    <div
                        className={
                            "flex h-full w-full items-start space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-3 text-start text-black active:border-r-0 active:border-b-0 " +
                            W95Font.className
                        }
                    >
                        <Avatar className="h-10 w-10 rounded-full">
                            <AvatarImage src={account.image || ""} />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                            <span className={"text-md " + W95FontBold.className}>
                                {account.display_name + " (@" + account.username + ")"}
                            </span>
                            <div className="text-xs flex space-x-1 text-center">
                                {account.accountType === "discord" ? <>
                                    <Image
                                        src={"/auth-logos/discord.svg"}
                                        alt={"Discord Logo"}
                                        width={15}
                                        height={15}
                                    />
                                    <span className="pt-0.75">Discord</span>
                                </> : <>
                                    <Image
                                        src={"/auth-logos/roblox.svg"}
                                        alt={"Roblox Logo"}
                                        width={15}
                                        height={15}
                                        className="invert"
                                    />
                                    <span className="pt-0.75">Roblox</span>
                                </>}
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}