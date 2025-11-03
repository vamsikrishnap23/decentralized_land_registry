// src/MerkleTreeVisualizer.tsx

import { useMemo } from "react";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";
import { Buffer } from "buffer";

const formatTreeHash = (hash: string) =>
  `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;

interface MerkleTreeVisualizerProps {
  txHashes: readonly string[];
}

const MerkleTreeVisualizer = ({ txHashes }: MerkleTreeVisualizerProps) => {
  const { treeLayers, root } = useMemo(() => {
    if (txHashes.length === 0) {
      return { treeLayers: [], root: "N/A" };
    }

    // Leaves must be buffers. The '0x' prefix from the hash is sliced off.
    const leaves = txHashes.map((tx) =>
      keccak256(Buffer.from(tx.slice(2), "hex"))
    );
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    // --- FIX IS HERE ---
    // Use getLayers() which returns a proper array, instead of getLayersAsObject()
    const treeLayers: Buffer[][] = tree.getLayers();
    const root = tree.getHexRoot();

    return { treeLayers, root };
  }, [txHashes]);

  if (txHashes.length === 0) {
    return (
      <p className="text-center text-gray-400">
        This block has no transactions to form a tree.
      </p>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-lg overflow-x-auto">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-400">MERKLE ROOT</p>
        <p className="font-mono text-indigo-400 text-sm break-all">{root}</p>
      </div>

      {treeLayers.reverse().map((layer: Buffer[], layerIndex: number) => (
        <div key={layerIndex}>
          <p className="text-center text-xs text-gray-500 mb-2">
            {layerIndex === treeLayers.length - 1
              ? "Leaves (Hashed Transaction Hashes)"
              : `Level ${treeLayers.length - 1 - layerIndex}`}
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {layer.map((hash: Buffer, hashIndex: number) => (
              <div
                key={hashIndex}
                className="bg-gray-800 border border-gray-700 rounded p-2 text-center"
                title={hash.toString("hex")}
              >
                <p className="font-mono text-xs text-gray-300">
                  {formatTreeHash(hash.toString("hex"))}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MerkleTreeVisualizer;
