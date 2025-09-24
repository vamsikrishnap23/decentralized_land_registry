// src/utils/ipfs.tsx
import { create } from "ipfs-http-client";

// Connect to *local* IPFS daemon (make sure `ipfs daemon` is running)
const client = create({ url: "http://127.0.0.1:5001/api/v0" });

/**
 * Upload a file to local IPFS node and return the gateway URL
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  try {
    const added = await client.add(file);
    // Local gateway URL
    return `http://127.0.0.1:8080/ipfs/${added.path}`;
  } catch (err) {
    console.error("IPFS upload error:", err);
    throw err;
  }
};
