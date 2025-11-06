import { useEffect, useMemo, useState } from "react";
import type { FC } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Link as LinkIcon, AlertCircle } from "lucide-react";
import { BrowserProvider } from "ethers";

interface LoginPageProps {
  onLogin: (account: string) => void;
  /**
   * Optional image URL for the left-side hero. If not supplied, a stylish placeholder renders.
   */
  heroImageUrl?: string;
}

const gradients = [
  "bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-neutral-900 dark:via-neutral-950 dark:to-black",
  "[background:radial-gradient(1200px_600px_at_80%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(800px_400px_at_-10%_80%,rgba(56,189,248,0.25),transparent)]",
];

const Card: FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={
      "relative rounded-3xl border border-zinc-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl shadow-zinc-800/5 " +
      className
    }
  >
    {/* subtle inner gradient */}
    <div className="pointer-events-none absolute inset-0 rounded-3xl [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-white/60 to-transparent dark:from-white/10" />
    <div className="relative">{children}</div>
  </div>
);

export default function LoginPage({ onLogin, heroImageUrl }: LoginPageProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasEthereum, setHasEthereum] = useState<boolean>(false);

  useEffect(() => {
    const exists = typeof window !== "undefined" && (window as any).ethereum;
    setHasEthereum(!!exists);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.title = "BlockTerritory";
  }, []);

  const connectWallet = async () => {
    if (!hasEthereum) {
      setError("MetaMask is not installed");
      return;
    }

    setIsConnecting(true);
    setError("");

    try {
      // ethers v6 BrowserProvider
      const provider = new BrowserProvider((window as any).ethereum);
      const accounts: string[] = await provider.send("eth_requestAccounts", []);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      onLogin(accounts[0]);
    } catch (err: unknown) {
      console.error("Failed to connect:", err);
      const message =
        err instanceof Error ? err.message : "Failed to connect to MetaMask";
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const bgClasses = useMemo(() => gradients.join(" "), []);
  // default to hero image in public folder when no heroImageUrl prop is provided
  const imageSrc = heroImageUrl ?? "/hero.png";

  return (
    <div
      className={`min-h-screen ${bgClasses} antialiased text-zinc-900 dark:text-zinc-100 font-sans`}
    >
      {/* Decorative grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:48px_48px] dark:opacity-[0.08]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-stretch gap-10 px-4 py-10 md:py-16 lg:flex-row lg:gap-12">
        {/* Left: Image holder / hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/40 shadow-xl backdrop-blur md:block lg:w-[55%] dark:border-white/10 dark:bg-white/[0.03]"
        >
          {/* show the hero image (from prop if provided, otherwise /hero.png in public/) */}
          <div
            className="h-[620px] w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${imageSrc})` }}
            role="img"
            aria-label="Hero image"
          />
        </motion.div>

        {/* Right: Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          className="flex w-full items-center justify-center lg:w-[45%]"
        >
          <Card className="w-full max-w-md p-8 md:p-10">
            {/* App Branding - match HomePage font and styling */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-extrabold tracking-tight text-black">
                  Block<span className="text-indigo-600">Territory</span>
                </div>
                <div className="text-sm text-gray-500">
                  Decentralized Land Registry
                </div>
              </div>
            </div>

            {/* Keep the badge below */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">
              <ShieldCheck className="h-4 w-4" />
              <span>Secure Web3 Access</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Connect your wallet
              </h1>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Link MetaMask to access the Land Registry. Your keys never leave
                your wallet.
              </p>
            </div>

            {/* Error state */}
            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="mt-[2px] h-5 w-5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <div className="mt-8 space-y-4">
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="group relative inline-flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-zinc-900 bg-white px-5 py-3 text-base font-medium text-zinc-900 transition-all hover:-translate-y-0.5 hover:bg-zinc-50 active:translate-y-0 disabled:opacity-60 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                {/* MetaMask fox svg already in your public folder */}
                <img
                  src="/metamask-fox.svg"
                  alt="MetaMask"
                  className="h-6 w-6"
                />

                {isConnecting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Connecting…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Connect with MetaMask
                    <LinkIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}

                {/* glossy highlight */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.6),transparent_60%)]" />
              </button>

              {!hasEthereum && (
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300/80 bg-white/70 px-5 py-3 text-sm font-medium text-zinc-700 underline decoration-zinc-400/60 underline-offset-4 hover:decoration-zinc-800 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300"
                >
                  Install MetaMask
                </a>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
