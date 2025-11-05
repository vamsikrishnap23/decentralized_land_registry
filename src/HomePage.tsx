import React, { useState, useEffect, useCallback } from "react";
import { contractAddress, contractABI } from "./lib/contractDetails";
import BlockVisualizer from "./BlockVisualizer";
import { formatAddress } from "./lib/utils";
import { uploadToIPFS } from "./utils/ipfs";

// --- Ethers.js Reference ---
import {
  BrowserProvider,
  Contract,
  keccak256,
  toUtf8Bytes,
  ethers,
  TransactionReceipt,
} from "ethers";

// --- TypeScript Interfaces ---
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Parcel {
  id: string;
  owner: string;
  coordsHash: string;
  metadataURI: string;
  areaSqm: string;
  forSale: boolean;
  price: string | null;
  rawPrice: string | null;
}

// --- Type guard for error with reason property ---
function isReasonError(err: unknown): err is { reason: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "reason" in err &&
    typeof (err as { reason: unknown }).reason === "string"
  );
}

// --- Main HomePage Component ---
export default function HomePage() {
  // Wallet state
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Contract read state
  const [totalParcels, setTotalParcels] = useState<number | null>(null);
  const [isContractLoading, setIsContractLoading] = useState<boolean>(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isParcelsLoading, setIsParcelsLoading] = useState<boolean>(false);

  // UI state for interactions
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [actionStatus, setActionStatus] = useState<string>("");
  const [listPrice, setListPrice] = useState<string>("");
  const [metadataEdit, setMetadataEdit] = useState<string>("");
  const [coordsSearch, setCoordsSearch] = useState<string>("");
  const [coordsSearchResult, setCoordsSearchResult] = useState<Parcel | null>(
    null
  );

  // Registration form state
  const [ownerAddress, setOwnerAddress] = useState<string>("");
  const [coordinates, setCoordinates] = useState<string>("");
  const [metadataURI, setMetadataURI] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [registerTxStatus, setRegisterTxStatus] = useState<string>("");

  // Transfer form state
  const [transferParcelId, setTransferParcelId] = useState<string>("");
  const [transferToAddress, setTransferToAddress] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferTxStatus, setTransferTxStatus] = useState<string>("");

  // IPFS Part
  const [selectedFileEdit, setSelectedFileEdit] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [relevantBlockNumbers, setRelevantBlockNumbers] = useState<number[]>(
    () => {
      // Try to get saved blocks from localStorage when the component first loads
      const savedBlocks = localStorage.getItem("parcelAppBlockNumbers");
      if (savedBlocks) {
        // If we found saved blocks, parse them back into an array
        return JSON.parse(savedBlocks);
      }
      // Otherwise, start with an empty array
      return [];
    }
  );

  // This useEffect hook saves the block numbers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "parcelAppBlockNumbers",
      JSON.stringify(relevantBlockNumbers)
    );
  }, [relevantBlockNumbers]);

  const addRelevantBlock = (blockNumber: number) => {
    setRelevantBlockNumbers((prev) => {
      // Create a new Set to ensure uniqueness
      const newSet = new Set([...prev, blockNumber]);
      // Convert back to array and sort ascending (oldest first)
      const newArray = Array.from(newSet).sort((a, b) => a - b);
      // Store in localStorage immediately as a backup
      localStorage.setItem("parcelAppBlockNumbers", JSON.stringify(newArray));
      return newArray;
    });
  };
  const handleFileUploadEdit = async () => {
    if (!selectedFileEdit) {
      alert("Please select a file first!");
      return;
    }
    try {
      setIsUploading(true);

      // ⬅️ Call the function from ipfs.tsx
      const url = await uploadToIPFS(selectedFileEdit);

      // Autofill the metadata field with the returned URL
      setMetadataEdit(url);
    } catch (err) {
      console.error("File upload failed:", err);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- Logic and Contract Functions ---

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setBalance(null);
    setTotalParcels(null);
    setParcels([]);
    setError("");
    // Don't clear relevantBlockNumbers to preserve chain history
  }, []);

  const fetchAllParcels = useCallback(async (count: number) => {
    if (!window.ethereum || !count) return;
    setIsParcelsLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(contractAddress, contractABI, provider);
      const fetched: Parcel[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const parcel = await contract.getParcel(i);
          fetched.push({
            id: parcel.id.toString(),
            owner: parcel.owner,
            coordsHash: parcel.coordsHash,
            metadataURI: parcel.metadataURI,
            areaSqm: parcel.areaSqm.toString(),
            forSale: parcel.forSale,
            price: parcel.price > 0 ? ethers.formatEther(parcel.price) : null,
            rawPrice: parcel.price > 0 ? parcel.price.toString() : null,
          });
        } catch (e) {
          // Parcel might not exist, skip it
        }
      }
      setParcels(fetched.reverse()); // Show newest first
    } catch (err) {
      setError("Could not fetch parcels from the smart contract.");
    } finally {
      setIsParcelsLoading(false);
    }
  }, []);

  const fetchTotalParcels = useCallback(async () => {
    if (!window.ethereum) return;
    setIsContractLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(contractAddress, contractABI, provider);
      const parcelCount = await contract.totalParcels();
      const count = Number(parcelCount);
      setTotalParcels(count);
      if (count > 0) {
        fetchAllParcels(count);
      } else {
        setParcels([]);
      }
    } catch (err) {
      setError("Could not fetch data from the smart contract.");
    } finally {
      setIsContractLoading(false);
    }
  }, [fetchAllParcels]);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not available.");
      return;
    }
    setIsConnecting(true);
    setError("");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        const currentAccount = accounts[0];
        const balanceWei = await provider.getBalance(currentAccount);
        setAccount(currentAccount);
        setOwnerAddress(currentAccount);
        setBalance(ethers.formatEther(balanceWei));
      }
    } catch (err) {
      const errorObj = err as { code?: number };
      setError(
        errorObj?.code === 4001
          ? "Request rejected by user."
          : "Failed to connect wallet."
      );
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerAddress || !coordinates || !area || !window.ethereum) {
      setRegisterTxStatus("Please fill in all required fields.");
      return;
    }
    setIsRegistering(true);
    setRegisterTxStatus("Preparing transaction...");

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const coordsHash = keccak256(toUtf8Bytes(coordinates));
      setRegisterTxStatus("Awaiting confirmation...");
      const tx = await contract.registerParcel(
        ownerAddress,
        coordsHash,
        metadataURI,
        area
      );
      const receipt: TransactionReceipt | null = await tx.wait();
      if (receipt?.blockNumber) {
        addRelevantBlock(receipt.blockNumber);
      }
      setRegisterTxStatus("Parcel registered successfully! 🎉");
      setOwnerAddress(account || "");
      setCoordinates("");
      setMetadataURI("");
      setArea("");
      fetchTotalParcels();
    } catch (err) {
      const errorObj = err as { reason?: string };
      setRegisterTxStatus(`Error: ${errorObj.reason || "Transaction failed."}`);
    } finally {
      setIsRegistering(false);
      setTimeout(() => setRegisterTxStatus(""), 5000);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferParcelId || !transferToAddress || !window.ethereum) {
      setTransferTxStatus("Please fill in all required fields.");
      return;
    }
    setIsTransferring(true);
    setTransferTxStatus("Preparing transaction...");

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      setTransferTxStatus("Awaiting confirmation...");
      const tx = await contract.transferParcel(
        transferParcelId,
        transferToAddress
      );
      const receipt: TransactionReceipt | null = await tx.wait();
      if (receipt?.blockNumber) {
        addRelevantBlock(receipt.blockNumber);
      }
      setTransferTxStatus("Parcel transferred successfully! 🎉");
      setTransferParcelId("");
      setTransferToAddress("");
      fetchTotalParcels(); // Refresh data after transfer
    } catch (err) {
      const errorObj = err as { reason?: string };
      setTransferTxStatus(`Error: ${errorObj.reason || "Transaction failed."}`);
    } finally {
      setIsTransferring(false);
      setTimeout(() => setTransferTxStatus(""), 5000);
    }
  };

  const handleListForSale = async (parcelId: string) => {
    if (!window.ethereum || !listPrice || parseFloat(listPrice) <= 0) {
      setActionStatus("Please enter a valid price in ETH.");
      return;
    }
    setActionStatus("Listing for sale...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const priceInWei = ethers.parseEther(listPrice); // Convert ETH to Wei
      const tx = await contract.listParcelForSale(parcelId, priceInWei);
      const receipt: TransactionReceipt | null = await tx.wait();
      if (receipt?.blockNumber) {
        addRelevantBlock(receipt.blockNumber);
      }
      setActionStatus("Parcel listed for sale!");
      fetchTotalParcels();
      setSelectedParcel(null);
      setListPrice("");
    } catch (err: unknown) {
      let reason = "Failed";
      if (isReasonError(err)) {
        reason = err.reason;
      }
      setActionStatus("Error: " + reason);
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  const handleCancelSale = async (parcelId: string) => {
    if (!window.ethereum) return;
    setActionStatus("Cancelling sale...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const tx = await contract.cancelSale(parcelId);
      const receipt: TransactionReceipt | null = await tx.wait();
      if (receipt?.blockNumber) {
        addRelevantBlock(receipt.blockNumber);
      }
      setActionStatus("Sale cancelled!");
      fetchTotalParcels();
      setSelectedParcel(null);
    } catch (err: unknown) {
      let reason = "Failed";
      if (isReasonError(err)) {
        reason = err.reason;
      }
      setActionStatus("Error: " + reason);
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  const handleBuyParcel = async (parcel: Parcel) => {
    if (!window.ethereum || !parcel.rawPrice) return;
    setActionStatus("Buying parcel...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const tx = await contract.buyParcel(parcel.id, {
        value: parcel.rawPrice,
      });
      const receipt: TransactionReceipt | null = await tx.wait();
      if (receipt?.blockNumber) {
        addRelevantBlock(receipt.blockNumber);
      }
      setActionStatus("Parcel bought successfully!");
      fetchTotalParcels();
      setSelectedParcel(null);
    } catch (err: unknown) {
      let reason = "Failed";
      if (isReasonError(err)) {
        reason = err.reason;
      }
      setActionStatus("Error: " + reason);
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  const handleUpdateMetadata = async (parcelId: string) => {
    if (!window.ethereum || !metadataEdit) return;
    setActionStatus("Updating metadata URI...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const tx = await contract.updateMetadataURI(parcelId, metadataEdit);
      const receipt: TransactionReceipt | null = await tx.wait();
      if (receipt?.blockNumber) {
        addRelevantBlock(receipt.blockNumber);
      }
      setActionStatus("Metadata updated!");
      fetchTotalParcels();
      setMetadataEdit("");
      setSelectedParcel(null);
    } catch (err: unknown) {
      let reason = "Failed";
      if (isReasonError(err)) {
        reason = err.reason;
      }
      setActionStatus("Error: " + reason);
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  const handleCoordsSearch = async () => {
    setCoordsSearchResult(null);
    setActionStatus("");
    if (!coordsSearch || !window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(contractAddress, contractABI, provider);
      // Hash the coordinates string before calling getParcelIdByCoords
      const coordsHash = keccak256(toUtf8Bytes(coordsSearch));
      const id = await contract.getParcelIdByCoords(coordsHash);
      if (id && id.toString() !== "0") {
        const parcel = await contract.getParcel(id);
        setCoordsSearchResult({
          id: parcel.id.toString(),
          owner: parcel.owner,
          coordsHash: parcel.coordsHash,
          metadataURI: parcel.metadataURI,
          areaSqm: parcel.areaSqm.toString(),
          forSale: parcel.forSale,
          price: parcel.price > 0 ? ethers.formatEther(parcel.price) : null,
          rawPrice: parcel.price > 0 ? parcel.price.toString() : null,
        });
      } else {
        setActionStatus("No parcel found for this coords hash.");
      }
    } catch (err: unknown) {
      let reason = "Failed";
      if (isReasonError(err)) {
        reason = err.reason;
      }
      setActionStatus("Error: " + reason);
    }
  };

  useEffect(() => {
    if (account) fetchTotalParcels();
  }, [account, fetchTotalParcels]);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum?.on) return;
    const handleAccountsChanged = (accounts: string[]) => {
      if (Array.isArray(accounts) && accounts.length > 0) {
        connectWallet();
      } else {
        disconnectWallet();
      }
    };
    ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [connectWallet, disconnectWallet]);

  useEffect(() => {
    if (account) fetchTotalParcels();
  }, [account, fetchTotalParcels]);

  // --- UI ---

  // Error boundary for blank screen or missing MetaMask/ethers
  if (!window.ethereum || typeof ethers === "undefined") {
    return (
      <div className="w-full max-w-md mx-auto mt-10">
        <div className="bg-red-900/20 text-red-400 border border-red-900 rounded-lg p-6 text-center">
          <h2 className="text-lg font-bold mb-2">Error</h2>
          <p>
            MetaMask and/or ethers.js not found. Please ensure MetaMask is
            installed and reload the page.
          </p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="w-full max-w-md mx-auto mt-10">
        <div className="bg-red-900/20 text-red-400 border border-red-900 rounded-lg p-6 text-center">
          <h2 className="text-lg font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            className="mt-4 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-md h-10 px-4 py-2"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  if (!account) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-6">
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md h-10 px-4 py-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isConnecting ? "Connecting..." : "Connect MetaMask Wallet"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 py-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-xl font-bold">
            {account?.substring(2, 6).toUpperCase()}
          </div>
          <div>
            <p className="font-mono text-lg" title={account || undefined}>
              {formatAddress(account)}
            </p>
            <p className="text-sm text-gray-400">
              {balance ? `${parseFloat(balance).toFixed(4)} ETH` : "..."}
            </p>
          </div>
        </div>
        <button
          onClick={disconnectWallet}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-md h-10 px-4 py-2 transition-colors"
        >
          Disconnect
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold mb-2">Total Parcels</h2>
          {isContractLoading ? (
            <p>...</p>
          ) : (
            <span className="text-4xl font-bold text-indigo-400">
              {totalParcels ?? "N/A"}
            </span>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold mb-2">On Sale</h2>
          {isParcelsLoading ? (
            <p>...</p>
          ) : (
            <span className="text-4xl font-bold text-green-400">
              {parcels.filter((p) => p.forSale).length}
            </span>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold mb-2">Your Parcels</h2>
          {isParcelsLoading ? (
            <p>...</p>
          ) : (
            <span className="text-4xl font-bold text-yellow-400">
              {
                parcels.filter(
                  (p) => p.owner?.toLowerCase() === account?.toLowerCase()
                ).length
              }
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">
          Search Parcel by Coordinates Hash
        </h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Enter coords hash (0x...)"
            value={coordsSearch}
            onChange={(e) => setCoordsSearch(e.target.value)}
            className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500"
          />
          <button
            onClick={handleCoordsSearch}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-4 py-2"
          >
            Search
          </button>
        </div>
        {coordsSearchResult && (
          <div className="mt-4 bg-gray-800 rounded p-3">
            <span className="font-mono text-indigo-400">
              ID: {coordsSearchResult.id}
            </span>{" "}
            |{" "}
            <span className="font-mono text-blue-300">
              Owner: {formatAddress(coordsSearchResult.owner)}
            </span>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">
          All Registered Parcels
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">
                  ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">
                  Owner
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">
                  Coords Hash
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isParcelsLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-400">
                    Loading parcels...
                  </td>
                </tr>
              ) : parcels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-400">
                    No parcels registered yet.
                  </td>
                </tr>
              ) : (
                parcels.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-800 cursor-pointer"
                    onClick={() => setSelectedParcel(p)}
                  >
                    <td className="px-3 py-2 text-sm text-indigo-300 font-mono">
                      {p.id}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-blue-200">
                      {formatAddress(p.owner)}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-400 truncate max-w-[120px]">
                      {p.coordsHash}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {p.forSale ? (
                        <span className="text-green-400 font-bold">
                          On Sale ({p.price} ETH)
                        </span>
                      ) : (
                        <span className="text-gray-400">Not for Sale</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedParcel && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-indigo-700 rounded-xl p-6 max-w-2xl w-full shadow-lg relative">
            <button
              onClick={() => setSelectedParcel(null)}
              className="absolute top-3 right-4 text-gray-400 hover:text-red-400 text-2xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold text-indigo-300 mb-4">
              Parcel Details (ID: {selectedParcel.id})
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-300 w-28 inline-block">
                  Owner:
                </span>
                <span className="font-mono text-blue-300">
                  {selectedParcel.owner}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-300 w-28 inline-block">
                  Coords Hash:
                </span>
                <span className="font-mono text-xs">
                  {selectedParcel.coordsHash}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-300 w-28 inline-block">
                  Area (sqm):
                </span>
                <span className="text-white">{selectedParcel.areaSqm}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-300 w-28 inline-block">
                  For Sale:
                </span>
                {selectedParcel.forSale ? (
                  <span className="font-bold text-green-400">Yes</span>
                ) : (
                  <span>No</span>
                )}
              </div>
              {selectedParcel.forSale && (
                <div>
                  <span className="font-semibold text-gray-300 w-28 inline-block">
                    Price:
                  </span>
                  <span className="font-mono text-green-300">
                    {selectedParcel.price} ETH
                  </span>
                </div>
              )}
              {selectedParcel.metadataURI && (
                <div>
                  <span className="font-semibold text-gray-300 w-28 inline-block">
                    Metadata URI:
                  </span>
                  <a
                    href={selectedParcel.metadataURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline break-all"
                  >
                    {selectedParcel.metadataURI}
                  </a>
                </div>
              )}
            </div>
            <div className="mt-6">
              <h4 className="font-bold text-lg mb-3">Actions</h4>
              {account?.toLowerCase() === selectedParcel.owner.toLowerCase() &&
                !selectedParcel.forSale && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleListForSale(selectedParcel.id);
                    }}
                    className="flex gap-2 items-center p-3 bg-gray-800 rounded-md"
                  >
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder="Price in ETH"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="bg-gray-700 border-gray-600 rounded-md p-2 text-white w-32"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-green-700 hover:bg-green-800 text-white rounded-md px-3 py-2 font-medium"
                    >
                      List for Sale
                    </button>
                  </form>
                )}
              {account?.toLowerCase() === selectedParcel.owner.toLowerCase() &&
                selectedParcel.forSale && (
                  <button
                    onClick={() => handleCancelSale(selectedParcel.id)}
                    className="bg-yellow-700 hover:bg-yellow-800 text-white rounded-md px-3 py-2 font-medium"
                  >
                    Cancel Sale
                  </button>
                )}
              {account?.toLowerCase() !== selectedParcel.owner.toLowerCase() &&
                selectedParcel.forSale && (
                  <button
                    onClick={() => handleBuyParcel(selectedParcel)}
                    className="bg-blue-700 hover:bg-blue-800 text-white rounded-md px-3 py-2 font-medium"
                  >
                    Buy for {selectedParcel.price} ETH
                  </button>
                )}
              {account?.toLowerCase() ===
                selectedParcel.owner.toLowerCase() && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateMetadata(selectedParcel.id);
                  }}
                  className="flex gap-2 items-center p-3 bg-gray-800 rounded-md mt-2"
                >
                  <input
                    type="text"
                    placeholder="New Metadata URI"
                    value={metadataEdit}
                    onChange={(e) => setMetadataEdit(e.target.value)}
                    className="bg-gray-700 border-gray-600 rounded-md p-2 text-white w-48"
                    required
                  />

                  <button
                    type="submit"
                    className="bg-purple-700 hover:bg-purple-800 text-white rounded-md px-3 py-2 font-medium"
                  >
                    Update URI
                  </button>
                </form>
              )}
            </div>
            {actionStatus && (
              <div className="mt-3 text-indigo-300 text-sm">{actionStatus}</div>
            )}
          </div>
        </div>
      )}
      <BlockVisualizer blockNumbers={relevantBlockNumbers} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Register New Parcel</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                htmlFor="owner"
                className="block text-sm font-medium text-gray-400"
              >
                Owner Address
              </label>
              <input
                type="text"
                id="owner"
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md p-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="coords"
                className="block text-sm font-medium text-gray-400"
              >
                Coordinates
              </label>
              <input
                type="text"
                id="coords"
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                placeholder="e.g., 40.7128,-74.0060"
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md p-2"
                required
              />
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                onChange={(e) =>
                  e.target.files && setSelectedFileEdit(e.target.files[0])
                }
                className="text-white"
              />
              <button
                type="button"
                onClick={handleFileUploadEdit} // calls IPFS upload
                // disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-3 py-2"
              >
                {isUploading ? "Uploading..." : "Upload to IPFS"}
              </button>
            </div>
            <div>
              <label
                htmlFor="metadata"
                className="block text-sm font-medium text-gray-400"
              >
                Metadata URI (Optional)
              </label>
              <input
                type="text"
                id="metadata"
                value={metadataEdit}
                onChange={(e) => setMetadataURI(e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md p-2"
              />
            </div>
            <div>
              <label
                htmlFor="area"
                className="block text-sm font-medium text-gray-400"
              >
                Area (sqm)
              </label>
              <input
                type="number"
                id="area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md p-2"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md h-10"
            >
              {isRegistering ? "Registering..." : "Register Parcel"}
            </button>
            {registerTxStatus && (
              <p className="text-sm text-center text-gray-400">
                {registerTxStatus}
              </p>
            )}
          </form>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Transfer Parcel</h2>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label
                htmlFor="transferId"
                className="block text-sm font-medium text-gray-400"
              >
                Parcel ID
              </label>
              <input
                type="number"
                id="transferId"
                value={transferParcelId}
                onChange={(e) => setTransferParcelId(e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md p-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="transferTo"
                className="block text-sm font-medium text-gray-400"
              >
                Recipient Address
              </label>
              <input
                type="text"
                id="transferTo"
                value={transferToAddress}
                onChange={(e) => setTransferToAddress(e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md p-2"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isTransferring}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md h-10"
            >
              {isTransferring ? "Transferring..." : "Transfer Ownership"}
            </button>
            {transferTxStatus && (
              <p className="text-sm text-center text-gray-400">
                {transferTxStatus}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
