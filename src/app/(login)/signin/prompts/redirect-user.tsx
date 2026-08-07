"use client";

export function RedirectUser({ returnUrl }: { returnUrl: string }) {
    if (typeof window !== "undefined") {
        window.location.href = returnUrl;
    }
    return <></>;
}