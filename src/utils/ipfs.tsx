// Small, robust IPFS upload helper — LOCAL NODE ONLY
// Uses your local Kubo (go-ipfs) HTTP API at 127.0.0.1:5001 (configurable).
// Returns a URL from your local gateway (default 127.0.0.1:8080).

const env = import.meta.env as Record<string, string | undefined>;

const IPFS_API_URL = (
  env.VITE_IPFS_API_URL || "http://127.0.0.1:5001/api/v0"
).replace(/\/$/, "");

const IPFS_GATEWAY_URL = (
  env.VITE_IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs"
).replace(/\/$/, "");

export const uploadToIPFS = async (file: File): Promise<string> => {
  try {
    const { create } = await import("ipfs-http-client");
    // Connect to your local node’s HTTP API
    const client = create({ url: IPFS_API_URL });

    // Add the file
    const added = await client.add(file as unknown as Blob);
    const rec = added as unknown as Record<string, any>;

    const cid =
      typeof rec.path === "string"
        ? rec.path
        : typeof rec.cid?.toString === "function"
        ? rec.cid.toString()
        : undefined;

    if (!cid) throw new Error("Local IPFS returned no CID");

    // Build a gateway URL (local gateway by default)
    return `${IPFS_GATEWAY_URL}/${cid}`;
  } catch (err) {
    throw new Error(
      `Local IPFS upload failed: ${(err as Error).message || String(err)}`
    );
  }
};
