import React, { useState, useEffect, useCallback } from "react";
import { contractAddress, contractABI } from "./lib/contractDetails";
import BlockVisualizer from "./BlockVisualizer";
import { formatAddress } from "./lib/utils";
import { uploadToIPFS } from "./utils/ipfs";
import Marketplace from "./MarketPlace";
import ParcelMetadataForm from "./ParcelMetadataForm";

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

interface HomePageProps {
  initialAccount: string;
  onDisconnect: () => void;
}

// ---------- Modern Light Theme Dashboard ----------
export default function HomePage({
  initialAccount,
  onDisconnect,
}: HomePageProps) {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "BlockTerritory";
    }
  }, []);
  // Wallet state
  const [account, setAccount] = useState<string>(initialAccount);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Contract read state
  const [totalParcels, setTotalParcels] = useState<number | null>(null);
  const [isContractLoading, setIsContractLoading] = useState<boolean>(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isParcelsLoading, setIsParcelsLoading] = useState<boolean>(false);
  const [showMineOnly, setShowMineOnly] = useState(false);

  // Tabs state for isolated functionality
  const [activeTab, setActiveTab] = useState<string>("parcels");

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
      const savedBlocks = localStorage.getItem("parcelAppBlockNumbers");
      return savedBlocks ? JSON.parse(savedBlocks) : [];
    }
  );

  useEffect(() => {
    localStorage.setItem(
      "parcelAppBlockNumbers",
      JSON.stringify(relevantBlockNumbers)
    );
  }, [relevantBlockNumbers]);

  const addRelevantBlock = (blockNumber: number) => {
    setRelevantBlockNumbers((prev) => {
      const newSet = new Set([...prev, blockNumber]);
      const newArray = Array.from(newSet).sort((a, b) => a - b);
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
      const url = await uploadToIPFS(selectedFileEdit);
      setMetadataEdit(url);
    } catch (err) {
      console.error("File upload failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Upload failed: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // --- Logic and Contract Functions ---
  const disconnectWallet = useCallback(() => {
    setBalance(null);
    setTotalParcels(null);
    setParcels([]);
    setError("");
    onDisconnect();
  }, [onDisconnect]);

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
        } catch {
          // ignore missing parcel index
        }
      }
      setParcels(fetched.reverse());
    } catch {
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
    } catch {
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
      setRegisterTxStatus("Parcel registered successfully!");
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
      setTransferTxStatus("Parcel transferred successfully!");
      setTransferParcelId("");
      setTransferToAddress("");
      fetchTotalParcels();
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
      const priceInWei = ethers.parseEther(listPrice);
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
    const raw = coordsSearch?.toString().trim();
    if (!raw) {
      setActionStatus("Please enter coordinates or a coords hash.");
      return;
    }
    if (!window.ethereum) {
      setActionStatus("MetaMask is not available.");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(contractAddress, contractABI, provider);

      // Accept either a 0x-prefixed coords hash or a raw coords string that we must keccak256
      const coordsHash = raw.startsWith("0x")
        ? raw
        : keccak256(toUtf8Bytes(raw));

      const id = await contract.getParcelIdByCoords(coordsHash);
      // id may be a BigNumber-like value; check for zero
      const idStr = id?.toString ? id.toString() : String(id);
      if (id && idStr !== "0") {
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
        setActionStatus("");
      } else {
        setActionStatus("No parcel found for this coords hash.");
      }
    } catch (err: unknown) {
      let reason = "Failed";
      if (isReasonError(err)) {
        reason = err.reason;
      } else if (err instanceof Error) {
        reason = err.message;
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

  // --- UI Error/No Wallet ---
  if (!window.ethereum || typeof ethers === "undefined") {
    return (
      <div className="w-full max-w-md mx-auto mt-10">
        <div className="bg-white text-red-600 border border-red-300 rounded-lg p-6 text-center">
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
        <div className="bg-white text-red-600 border border-red-300 rounded-lg p-6 text-center">
          <h2 className="text-lg font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            className="mt-4 bg-black hover:bg-zinc-900 text-white font-medium rounded-md h-10 px-4 py-2"
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
      <div className="w-full max-w-md mx-auto mt-20">
        <div className="text-center space-y-6 px-4">
          <img
            src="/metamask-fox.svg"
            alt="MetaMask"
            className="w-24 h-24 mx-auto"
          />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-black">
              Connect Your Wallet
            </h2>
            <p className="text-gray-700">
              Please connect your MetaMask wallet to access the land registry
            </p>
          </div>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-white border-2 border-black hover:bg-gray-50 text-black font-medium rounded-lg h-12 px-6 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group"
          >
            {isConnecting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-black"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <img
                  src="/metamask-fox.svg"
                  alt="MetaMask"
                  className="h-5 w-5"
                />
                <span>Connect with MetaMask</span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Layout ----------
  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 lg:px-0">
      {/* Top Navigation / Account Bar */}
      <div className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-extrabold tracking-tight text-black">
            Block<span className="text-indigo-600">Territory</span>
          </div>
          <div className="text-sm text-gray-500">
            Decentralized Land Registry
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white border border-black rounded-full px-4 py-2 shadow-sm">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-sm font-bold text-white">
            {account?.substring(2, 6).toUpperCase()}
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-black" title={account}>
              {formatAddress(account)}
            </p>
            <p className="text-xs text-gray-600">
              {balance ? `${parseFloat(balance).toFixed(4)} ETH` : "..."}
            </p>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-xs border border-black bg-white hover:bg-gray-100 text-black font-medium px-3 py-1.5 rounded-full transition"
          >
            Disconnect
          </button>
        </div>
      </div>
      <div className="relative mb-6 -mx-4 lg:mx-0">
        <div className="overflow-visible">
          <BlockVisualizer blockNumbers={relevantBlockNumbers} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          {
            label: "Total Parcels",
            value: totalParcels ?? "N/A",
            color: "text-indigo-600",
          },
          {
            label: "On Sale",
            value: isParcelsLoading
              ? "..."
              : parcels.filter((p) => p.forSale).length,
            color: "text-green-600",
          },
          {
            label: "Your Parcels",
            value: isParcelsLoading
              ? "..."
              : parcels.filter(
                  (p) => p.owner?.toLowerCase() === account?.toLowerCase()
                ).length,
            color: "text-amber-600",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="absolute inset-0 rounded-3xl pointer-events-none [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-black/5 to-transparent" />
            <div className="relative">
              <h2 className="text-lg font-semibold text-black mb-2">
                {kpi.label}
              </h2>
              <span className={`text-4xl font-bold ${kpi.color}`}>
                {isContractLoading && i === 0 ? "..." : kpi.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main content tabs */}
      <div className="mt-6">
        <div className="bg-white rounded-3xl border border-zinc-200 p-1 inline-flex gap-1">
          {[
            { id: "parcels", label: "Parcels" },
            { id: "market", label: "Marketplace" },
            { id: "register", label: "Register" },
            { id: "transfer", label: "Transfer" },
            { id: "search", label: "Search" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${
                activeTab === t.id ? "bg-black text-white" : "text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "parcels" && (
            <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="absolute inset-0 rounded-3xl pointer-events-none [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-black/5 to-transparent" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-black">Parcels</h2>
                  <div className="inline-flex items-center rounded-full border border-black bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setShowMineOnly(false)}
                      className={`px-3 py-1.5 text-sm rounded-full transition ${
                        showMineOnly ? "text-black" : "bg-black text-white"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMineOnly(true)}
                      className={`px-3 py-1.5 text-sm rounded-full transition ${
                        showMineOnly ? "bg-black text-white" : "text-black"
                      }`}
                    >
                      Mine
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          ID
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          Owner
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          Coords Hash
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {isParcelsLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-4 text-gray-500"
                          >
                            Loading parcels...
                          </td>
                        </tr>
                      ) : (showMineOnly
                          ? parcels.filter(
                              (p) =>
                                p.owner?.toLowerCase() ===
                                account?.toLowerCase()
                            )
                          : parcels
                        ).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-4 text-gray-500"
                          >
                            {showMineOnly
                              ? "You don’t own any parcels yet."
                              : "No parcels registered yet."}
                          </td>
                        </tr>
                      ) : (
                        (showMineOnly
                          ? parcels.filter(
                              (p) =>
                                p.owner?.toLowerCase() ===
                                account?.toLowerCase()
                            )
                          : parcels
                        ).map((p) => (
                          <tr
                            key={p.id}
                            className="hover:bg-zinc-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedParcel(p)}
                          >
                            <td className="px-3 py-2 text-sm text-indigo-600 font-mono">
                              {p.id}
                            </td>
                            <td className="px-3 py-2 text-sm font-mono text-blue-600">
                              {formatAddress(p.owner)}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-gray-700 truncate max-w-[120px]">
                              {p.coordsHash}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {p.forSale ? (
                                <span className="text-green-600 font-semibold">
                                  On Sale ({p.price} ETH)
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  Not for Sale
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === "market" && (
            <Marketplace
              parcels={parcels}
              account={account}
              isLoading={isParcelsLoading}
              onBuy={handleBuyParcel}
            />
          )}

          {activeTab === "register" && (
            <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="absolute inset-0 rounded-3xl pointer-events-none [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-black/5 to-transparent" />
              <div className="relative">
                <h2 className="text-xl font-semibold text-black">
                  Register New Parcel
                </h2>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-black mb-2">
                    Create Metadata (image + coords)
                  </h3>
                  <ParcelMetadataForm onReady={(url) => setMetadataURI(url)} />
                </div>

                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div>
                    <label
                      htmlFor="owner"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Owner Address
                    </label>
                    <input
                      type="text"
                      id="owner"
                      value={ownerAddress}
                      onChange={(e) => setOwnerAddress(e.target.value)}
                      className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2 text-black focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="coords"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Coordinates
                    </label>
                    <input
                      type="text"
                      id="coords"
                      value={coordinates}
                      onChange={(e) => setCoordinates(e.target.value)}
                      placeholder="e.g., 40.7128,-74.0060"
                      className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2 text-black focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      onChange={(e) =>
                        e.target.files && setSelectedFileEdit(e.target.files[0])
                      }
                      className="text-black bg-white border-2 border-black rounded-2xl px-4 py-2 focus:outline-none focus:ring-0 file:mr-3 file:px-3 file:py-1.5 file:rounded-xl file:border-0 file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200"
                    />
                    <button
                      type="button"
                      onClick={handleFileUploadEdit}
                      className="relative inline-flex items-center justify-center rounded-2xl border-2 border-black bg-white px-4 py-2 text-base font-medium text-black transition-all hover:-translate-y-0.5 hover:bg-gray-50 active:translate-y-0"
                    >
                      {isUploading ? "Uploading..." : "Upload to IPFS"}
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="metadata"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Metadata URI (Optional)
                    </label>
                    <input
                      type="text"
                      id="metadata"
                      value={metadataEdit}
                      onChange={(e) => setMetadataURI(e.target.value)}
                      className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2 text-black focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="area"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Area (sqm)
                    </label>
                    <input
                      type="number"
                      id="area"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2 text-black focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="relative w-full inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:opacity-50"
                  >
                    {isRegistering ? "Registering..." : "Register Parcel"}
                  </button>
                  {registerTxStatus && (
                    <p className="text-sm text-center text-gray-700">
                      {registerTxStatus}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}

          {activeTab === "transfer" && (
            <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="absolute inset-0 rounded-3xl pointer-events-none [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-black/5 to-transparent" />
              <div className="relative">
                <h2 className="text-xl font-semibold text-black">
                  Transfer Parcel
                </h2>
                <form onSubmit={handleTransfer} className="space-y-4 mt-4">
                  <div>
                    <label
                      htmlFor="transferId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Parcel ID
                    </label>
                    <input
                      type="number"
                      id="transferId"
                      value={transferParcelId}
                      onChange={(e) => setTransferParcelId(e.target.value)}
                      className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2 text-black focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="transferTo"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      id="transferTo"
                      value={transferToAddress}
                      onChange={(e) => setTransferToAddress(e.target.value)}
                      className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2 text-black focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isTransferring}
                    className="relative w-full inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:opacity-50"
                  >
                    {isTransferring ? "Transferring..." : "Transfer Ownership"}
                  </button>
                  {transferTxStatus && (
                    <p className="text-sm text-center text-gray-700">
                      {transferTxStatus}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}

          {activeTab === "search" && (
            <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="absolute inset-0 rounded-3xl pointer-events-none [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-black/5 to-transparent" />
              <div className="relative">
                <h2 className="text-xl font-semibold text-black mb-4">
                  Search Parcel by Coordinates Hash
                </h2>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Enter coords (e.g., 40.7128,-74.0060) or coords hash (0x...)"
                    value={coordsSearch}
                    onChange={(e) => setCoordsSearch(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-2xl shadow-sm p-2 text-black focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <button
                    onClick={handleCoordsSearch}
                    className="relative inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0"
                  >
                    Search
                  </button>
                </div>
                {coordsSearchResult && (
                  <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-3">
                    <span className="font-mono text-indigo-600">
                      ID: {coordsSearchResult.id}
                    </span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="font-mono text-blue-600">
                      Owner: {formatAddress(coordsSearchResult.owner)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parcel Modal */}
      {selectedParcel && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 max-w-2xl w-full shadow-xl">
            <div className="absolute inset-0 rounded-3xl pointer-events-none [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-black/5 to-transparent" />
            <div className="relative">
              <button
                onClick={() => setSelectedParcel(null)}
                className="absolute top-3 right-4 text-gray-400 hover:text-red-600 text-2xl font-bold"
              >
                &times;
              </button>
              <h3 className="text-xl font-semibold text-black mb-4">
                Parcel Details (ID: {selectedParcel.id})
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-700 w-28 inline-block">
                    Owner:
                  </span>
                  <span className="font-mono text-blue-600">
                    {selectedParcel.owner}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 w-28 inline-block">
                    Coords Hash:
                  </span>
                  <span className="font-mono text-xs text-gray-700">
                    {selectedParcel.coordsHash}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 w-28 inline-block">
                    Area (sqm):
                  </span>
                  <span className="text-black">{selectedParcel.areaSqm}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 w-28 inline-block">
                    For Sale:
                  </span>
                  {selectedParcel.forSale ? (
                    <span className="font-semibold text-green-600">Yes</span>
                  ) : (
                    <span className="text-gray-600">No</span>
                  )}
                </div>
                {selectedParcel.forSale && (
                  <div>
                    <span className="font-semibold text-gray-700 w-28 inline-block">
                      Price:
                    </span>
                    <span className="font-mono text-green-600">
                      {selectedParcel.price} ETH
                    </span>
                  </div>
                )}
                {selectedParcel.metadataURI && (
                  <div>
                    <span className="font-semibold text-gray-700 w-28 inline-block">
                      Metadata URI:
                    </span>
                    <a
                      href={selectedParcel.metadataURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline break-all"
                    >
                      {selectedParcel.metadataURI}
                    </a>
                  </div>
                )}
              </div>

              {/* Actions in modal */}
              <div className="mt-6 space-y-2">
                {account?.toLowerCase() ===
                  selectedParcel.owner.toLowerCase() &&
                  !selectedParcel.forSale && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleListForSale(selectedParcel.id);
                      }}
                      className="flex gap-2 items-center p-3 bg-zinc-50 border border-zinc-200 rounded-2xl"
                    >
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        placeholder="Price in ETH"
                        value={listPrice}
                        onChange={(e) => setListPrice(e.target.value)}
                        className="bg-white border-2 border-black rounded-2xl p-2 text-black w-32 focus:ring-2 focus:ring-black focus:border-black"
                        required
                      />
                      <button
                        type="submit"
                        className="relative inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0"
                      >
                        List for Sale
                        <span className="pointer-events-none absolute inset-0 rounded-2xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.25),transparent_60%)]" />
                      </button>
                    </form>
                  )}
                {account?.toLowerCase() ===
                  selectedParcel.owner.toLowerCase() &&
                  selectedParcel.forSale && (
                    <button
                      onClick={() => handleCancelSale(selectedParcel.id)}
                      className="relative inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0"
                    >
                      Cancel Sale
                      <span className="pointer-events-none absolute inset-0 rounded-2xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.25),transparent_60%)]" />
                    </button>
                  )}
                {account?.toLowerCase() !==
                  selectedParcel.owner.toLowerCase() &&
                  selectedParcel.forSale && (
                    <button
                      onClick={() => handleBuyParcel(selectedParcel)}
                      className="relative inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0"
                    >
                      Buy for {selectedParcel.price} ETH
                      <span className="pointer-events-none absolute inset-0 rounded-2xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.25),transparent_60%)]" />
                    </button>
                  )}
                {account?.toLowerCase() ===
                  selectedParcel.owner.toLowerCase() && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateMetadata(selectedParcel.id);
                    }}
                    className="flex gap-2 items-center p-3 bg-zinc-50 border border-zinc-200 rounded-2xl"
                  >
                    <input
                      type="text"
                      placeholder="New Metadata URI"
                      value={metadataEdit}
                      onChange={(e) => setMetadataEdit(e.target.value)}
                      className="bg-white border-2 border-black rounded-2xl p-2 text-black w-48 focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                    <button
                      type="submit"
                      className="relative inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0"
                    >
                      Update URI
                      <span className="pointer-events-none absolute inset-0 rounded-2xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.25),transparent_60%)]" />
                    </button>
                  </form>
                )}
              </div>
              {actionStatus && (
                <div className="mt-3 text-gray-700 text-sm">{actionStatus}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
