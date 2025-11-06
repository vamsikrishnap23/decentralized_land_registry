// src/BlockVisualizer.tsx

import React, { useState, useEffect } from "react";
import { BrowserProvider, Block } from "ethers";
import MerkleTreeVisualizer from "./MerkleTreeVisualizer";

// --- Define an interface for the component's props ---
interface BlockVisualizerProps {
  blockNumbers: number[];
}

// Helper function to shorten long addresses or hashes
const formatHash = (hash: string) =>
  `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;

// A simple SVG component for the block icon 🧊
const BlockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-16 h-16 text-black group-hover:text-indigo-600 transition-colors duration-300"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

// The component now accepts 'blockNumbers' as a prop
const BlockVisualizer = ({ blockNumbers }: BlockVisualizerProps) => {
  const [blocks, setBlocks] = useState<(Block | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for modals
  const [viewingTreeForBlock, setViewingTreeForBlock] = useState<Block | null>(
    null
  );
  const [selectedBlockDetails, setSelectedBlockDetails] =
    useState<Block | null>(null);

  useEffect(() => {
    const fetchBlocksByNumber = async () => {
      if (!window.ethereum) {
        setError("MetaMask is not available.");
        return;
      }
      if (blockNumbers.length === 0) {
        setBlocks([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const provider = new BrowserProvider(window.ethereum);
        const blockPromises = blockNumbers.map((num) => provider.getBlock(num));
        const resolvedBlocks = await Promise.all(blockPromises);
        resolvedBlocks.sort((a, b) => (b?.number || 0) - (a?.number || 0));
        setBlocks(resolvedBlocks);
      } catch (err) {
        console.error("Failed to fetch specific blocks:", err);
        setError("Could not fetch transaction blocks.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocksByNumber();
  }, [blockNumbers]);

  if (blockNumbers.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-300 rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold mb-2 text-black">
          Loading Transaction Blocks...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white text-red-700 border border-red-300 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-2 text-black">
          Error Fetching Blocks
        </h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Use a fragment to wrap the component and the modal */}
      <div className="relative bg-white border border-gray-300 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">
          Transaction Blocks
        </h2>
        <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="relative flex flex-nowrap items-center gap-3 min-w-max py-2 my-4">
            {blocks.map((block, index) => {
              if (!block) return null;
              return (
                <React.Fragment key={block.number}>
                  <div
                    onClick={() => setSelectedBlockDetails(block)}
                    className="relative group inline-flex flex-col items-center cursor-pointer p-2 hover:scale-105 transition-transform"
                  >
                    <BlockIcon />
                    <span className="mt-1 text-sm font-semibold text-gray-800 group-hover:text-black">
                      #{block.number}
                    </span>
                  </div>

                  {/* Connector stays inline */}
                  {index < blocks.length - 1 && (
                    <div className="hidden md:block w-20 h-px bg-gray-300 border-t border-dashed border-gray-300" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      {/* Block Details Modal */}
      {selectedBlockDetails && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedBlockDetails(null)}
        >
          <div
            className="bg-white border border-gray-300 rounded-xl max-w-xl w-full shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedBlockDetails(null)}
              className="absolute top-3 right-4 text-gray-500 hover:text-red-600 text-2xl font-bold"
            >
              &times;
            </button>
            <div className="p-6">
              <h3 className="text-xl font-bold text-indigo-700 mb-4 flex justify-between items-center">
                <span>Block #{selectedBlockDetails.number}</span>
                <span className="text-sm font-normal text-gray-600">
                  {selectedBlockDetails.transactions.length} Txs
                </span>
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {new Date(
                    selectedBlockDetails.timestamp * 1000
                  ).toLocaleString()}
                </p>
                <div className="space-y-3">
                  <p className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Hash:</span>
                    <span className="font-mono text-sm text-black">
                      {selectedBlockDetails.hash}
                    </span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Miner:</span>
                    <span className="font-mono text-sm text-black">
                      {selectedBlockDetails.miner}
                    </span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">
                      Gas Used:
                    </span>
                    <span className="font-mono text-sm text-black">
                      {selectedBlockDetails.gasUsed.toString()}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => {
                      setViewingTreeForBlock(selectedBlockDetails);
                      setSelectedBlockDetails(null);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-4 py-2 text-sm transition-colors"
                  >
                    View Merkle Tree
                  </button>
                  <a
                    href={`https://sepolia.etherscan.io/block/${selectedBlockDetails.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl px-4 py-2 text-sm text-center transition-colors"
                  >
                    View on Etherscan
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merkle Tree Modal */}
      {viewingTreeForBlock && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={() => setViewingTreeForBlock(null)}
        >
          <div
            className="bg-white border border-gray-300 rounded-xl max-w-4xl w-full shadow-lg relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingTreeForBlock(null)}
              className="absolute top-3 right-4 text-gray-500 hover:text-red-600 text-2xl font-bold"
            >
              &times;
            </button>
            <div className="p-6">
              <h3 className="text-xl font-bold text-indigo-700 mb-4">
                Merkle Tree for Block #{viewingTreeForBlock.number}
              </h3>
              <MerkleTreeVisualizer
                txHashes={viewingTreeForBlock.transactions}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlockVisualizer;
