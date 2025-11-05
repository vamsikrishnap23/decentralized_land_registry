import { useMemo, useState } from "react";
import type { FC } from "react";
import { motion } from "framer-motion";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";
import { Buffer } from "buffer";
import { GitBranch, Layers3, Copy, Check, AlertCircle } from "lucide-react";

interface MerkleTreeVisualizerProps {
  txHashes: readonly string[];
  className?: string;
}

const formatTreeHash = (hash: string) =>
  `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;

const Badge: FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ children, icon, className = "" }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border border-zinc-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-zinc-200 ${className}`}
  >
    {icon}
    {children}
  </span>
);

const Card: FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`relative rounded-3xl border border-zinc-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl shadow-zinc-800/5 ${className}`}
  >
    <div className="pointer-events-none absolute inset-0 rounded-3xl [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-white/50 to-transparent dark:from-white/10" />
    <div className="relative">{children}</div>
  </div>
);

const Pill: FC<{ children: React.ReactNode; title?: string }> = ({
  children,
  title,
}) => (
  <div
    className="group relative rounded-xl border border-zinc-300/40 bg-white/50 px-3 py-2 text-center font-mono text-[11px] text-zinc-800 shadow-sm hover:border-zinc-400 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
    title={title}
  >
    {/* subtle sheen */}
    <span className="pointer-events-none absolute inset-0 rounded-xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.65),transparent_70%)]" />
    <span className="relative">{children}</span>
  </div>
);

export default function MerkleTreeVisualizer({
  txHashes,
  className = "",
}: MerkleTreeVisualizerProps) {
  const [copied, setCopied] = useState(false);

  const { treeLayers, root, error } = useMemo(() => {
    try {
      if (!txHashes || txHashes.length === 0) {
        return { treeLayers: [] as Buffer[][], root: "N/A", error: "" };
      }
      const normalized = txHashes.filter(Boolean);
      if (normalized.length === 0)
        return { treeLayers: [] as Buffer[][], root: "N/A", error: "" };

      // Hash each tx hash again as leaf (spec-dependent; matches your original). Remove 0x prefix before feeding bytes.
      const leaves = normalized.map((tx) =>
        keccak256(Buffer.from(tx.slice(2), "hex"))
      );
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const treeLayers: Buffer[][] = tree.getLayers();
      const root = tree.getHexRoot();
      return { treeLayers, root, error: "" };
    } catch (e: any) {
      return {
        treeLayers: [] as Buffer[][],
        root: "N/A",
        error: e?.message ?? "Failed to build Merkle tree",
      };
    }
  }, [txHashes]);

  const copyRoot = async () => {
    if (!root || root === "N/A") return;
    try {
      await navigator.clipboard.writeText(root);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const bgDecor =
    "[background:radial-gradient(900px_400px_at_85%_-10%,rgba(99,102,241,0.20),transparent),radial-gradient(700px_320px_at_-10%_90%,rgba(56,189,248,0.20),transparent)]";

  if (!txHashes || txHashes.length === 0) {
    return (
      <Card className={`p-8 ${className}`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge icon={<AlertCircle className="h-4 w-4" />}>
            No transactions
          </Badge>
          <p className="max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
            This block has no transactions to form a Merkle tree. Provide
            transaction hashes to visualize layers and the root.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`relative ${bgDecor} antialiased`}>
      <Card className={`p-6 md:p-8 ${className}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Badge icon={<GitBranch className="h-4 w-4" />}>Merkle Tree</Badge>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Transaction Merkle Root
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Built with Keccak-256 • Sorted pairs
            </p>
          </div>

          <button
            onClick={copyRoot}
            className="group relative inline-flex items-center gap-2 rounded-xl border-2 border-zinc-900 bg-white px-3 py-2 text-xs font-medium text-zinc-900 transition-all hover:-translate-y-0.5 hover:bg-zinc-50 active:translate-y-0 disabled:opacity-60 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10"
            title="Copy Merkle root"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy root"}
            <span className="pointer-events-none absolute inset-0 rounded-xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.6),transparent_60%)]" />
          </button>
        </div>

        {/* Root display */}
        <div className="mt-6 rounded-2xl border border-zinc-200/60 bg-white/60 p-4 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Merkle Root
          </p>
          <p className="mt-1 break-all font-mono text-sm text-indigo-600 dark:text-indigo-400">
            {root}
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-[2px] h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {/* Layers */}
        <div className="mt-8 space-y-6 overflow-x-auto">
          {/** We reverse for top-down rendering: root -> leaves **/}
          {treeLayers
            .slice()
            .reverse()
            .map((layer: Buffer[], idx: number, arr: Buffer[][]) => {
              const levelFromTop = idx; // 0 is root
              const isLeaves = idx === arr.length - 1;
              const label = isLeaves
                ? "Leaves (Hashed Transaction Hashes)"
                : `Level ${levelFromTop}`;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut",
                    delay: 0.03 * idx,
                  }}
                  className=""
                >
                  <div className="mb-2 flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
                    <Layers3 className="h-4 w-4" />
                    <span>{label}</span>
                  </div>

                  <div className="relative mx-auto flex max-w-full flex-wrap items-center justify-center gap-2 px-2">
                    {layer.map((hash: Buffer, hIdx: number) => {
                      const hex = hash.toString("hex");
                      return (
                        <Pill key={`${idx}-${hIdx}`} title={hex}>
                          {formatTreeHash(hex)}
                        </Pill>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}


