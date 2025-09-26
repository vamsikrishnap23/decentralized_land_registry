// BlockVisualizer.tsx

import React, { useState, useEffect } from "react";
import { BrowserProvider, Block } from "ethers";

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
    className="w-16 h-16 text-gray-600 group-hover:text-indigo-500 transition-colors duration-300"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const BlockVisualizer = () => {
  const [blocks, setBlocks] = useState<(Block | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentBlocks = async () => {
      if (!window.ethereum) {
        setError("MetaMask is not available.");
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const provider = new BrowserProvider(window.ethereum);
        const latestBlockNumber = await provider.getBlockNumber();
        const blockPromises: Promise<Block | null>[] = [];

        for (let i = 0; i < 10; i++) {
          if (latestBlockNumber - i >= 0) {
            blockPromises.push(provider.getBlock(latestBlockNumber - i));
          }
        }

        const resolvedBlocks = await Promise.all(blockPromises);
        setBlocks(resolvedBlocks.reverse());
      } catch (err) {
        console.error("Failed to fetch blocks:", err);
        setError("Could not fetch recent blocks from the network.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentBlocks();
    const intervalId = setInterval(fetchRecentBlocks, 15000);
    return () => clearInterval(intervalId);
  }, []);

  if (isLoading && blocks.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Recent Blocks</h2>
        <p className="text-gray-400">
          Loading recent blocks from the network...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 text-red-400 border border-red-900 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Error Fetching Blocks</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Recent Blocks on the Network
      </h2>
      <div className="flex flex-wrap justify-center items-center gap-2">
        {blocks.map((block, index) => {
          if (!block) return null;

          return (
            <React.Fragment key={block.number}>
              {/* --- NEW --- Added the <a> tag wrapper --- */}
              <a
                href={`https://sepolia.etherscan.io/block/${block.number}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="relative group flex flex-col items-center cursor-pointer p-2">
                  <BlockIcon />
                  <span className="mt-1 text-sm font-semibold text-gray-400 group-hover:text-white">
                    #{block.number}
                  </span>
                  {/* The hover card logic remains unchanged */}
                  <div
                    className="absolute bottom-full mb-3 w-80 max-w-xs bg-gray-800 border border-indigo-500 rounded-lg shadow-2xl p-4
                                                   opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                                                   transition-all duration-300 z-10"
                  >
                    <h4 className="font-bold text-lg text-indigo-400 flex justify-between">
                      <span>Block #{block.number}</span>
                      <span className="text-sm font-normal text-gray-400">
                        {block.transactions.length} Txs
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">
                      {new Date(block.timestamp * 1000).toLocaleString()}
                    </p>
                    <div className="mt-2 space-y-1 text-xs break-words">
                      <p title={block.hash || undefined}>
                        <span className="font-semibold text-gray-400">
                          Hash:{" "}
                        </span>
                        <span className="font-mono text-gray-300">
                          {block.hash ? formatHash(block.hash) : "Pending..."}
                        </span>
                      </p>
                      <p title={block.miner || undefined}>
                        <span className="font-semibold text-gray-400">
                          Miner:{" "}
                        </span>
                        <span className="font-mono text-gray-300">
                          {block.miner ? formatHash(block.miner) : "N/A"}
                        </span>
                      </p>
                      <p>
                        <span className="font-semibold text-gray-400">
                          Gas Used:{" "}
                        </span>
                        <span className="font-mono text-gray-300">
                          {block.gasUsed.toString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </a>
              {/* --- END of <a> tag wrapper --- */}

              {/* Connector Line */}
              {index < blocks.length - 1 && (
                <div className="hidden md:block w-20 h-px bg-gray-700 border-t border-dashed border-gray-600"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default BlockVisualizer;
