import React, { useState, useEffect, useCallback } from "react";
import {
  ethers,
  BrowserProvider,
  Contract,
  keccak256,
  toUtf8Bytes,
} from "ethers";

// --- START: Smart Contract Details ---
const contractAddress = "0x5ee1a6424c69Aa9E74b63Ac1552fE4123f0C0a8c";
const contractABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "AccessControlBadConfirmation", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "bytes32", name: "neededRole", type: "bytes32" },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "addRegistrar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "parcelId", type: "uint256" }],
    name: "buyParcel",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "parcelId", type: "uint256" }],
    name: "cancelSale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "FailedCall", type: "error" },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    name: "InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "parcelId", type: "uint256" },
      { internalType: "uint256", name: "price", type: "uint256" },
    ],
    name: "listParcelForSale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "parcelId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
    ],
    name: "ParcelListedForSale",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "parcelId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "coordsHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "string",
        name: "metadataURI",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "areaSqm",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "registrar",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "txHash",
        type: "bytes32",
      },
    ],
    name: "ParcelRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "parcelId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "ParcelSaleCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "parcelId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "seller",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
    ],
    name: "ParcelSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "parcelId",
        type: "uint256",
      },
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "txHash",
        type: "bytes32",
      },
    ],
    name: "ParcelTransferred",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "owner_", type: "address" },
      { internalType: "bytes32", name: "coordsHash_", type: "bytes32" },
      { internalType: "string", name: "metadataURI_", type: "string" },
      { internalType: "uint256", name: "areaSqm_", type: "uint256" },
    ],
    name: "registerParcel",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "removeRegistrar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "callerConfirmation", type: "address" },
    ],
    name: "renounceRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "role", type: "bytes32" },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
      },
    ],
    name: "RoleAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "role", type: "bytes32" },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "role", type: "bytes32" },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleRevoked",
    type: "event",
  },
  {
    inputs: [
      { internalType: "uint256", name: "parcelId", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
    ],
    name: "transferParcel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "parcelId", type: "uint256" },
      { internalType: "string", name: "newURI", type: "string" },
    ],
    name: "updateMetadataURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "parcelId", type: "uint256" }],
    name: "getParcel",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "bytes32", name: "coordsHash", type: "bytes32" },
      { internalType: "string", name: "metadataURI", type: "string" },
      { internalType: "uint256", name: "areaSqm", type: "uint256" },
      { internalType: "bool", name: "forSale", type: "bool" },
      { internalType: "uint256", name: "price", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "coordsHash_", type: "bytes32" }],
    name: "getParcelIdByCoords",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }],
    name: "getRoleAdmin",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "hasRole",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner_", type: "address" }],
    name: "parcelsOf",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REGISTRAR_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalParcels",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
// --- END: Smart Contract Details ---

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function HomePage() {
  // Wallet state
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Contract read state
  const [totalParcels, setTotalParcels] = useState<number | null>(null);
  const [isContractLoading, setIsContractLoading] = useState<boolean>(false);
  const [parcels, setParcels] = useState<any[]>([]);
  const [isParcelsLoading, setIsParcelsLoading] = useState<boolean>(false);

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

  const formatAddress = (addr: string | null): string =>
    addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "";

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setBalance(null);
    setTotalParcels(null);
    setParcels([]);
    setError("");
  }, []);

  // Fetch all parcels
  const fetchAllParcels = useCallback(async (count: number) => {
    if (!window.ethereum || !count) return;
    setIsParcelsLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(contractAddress, contractABI, provider);
      const fetched: any[] = [];
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
            price: parcel.price ? ethers.formatEther(parcel.price) : null,
          });
        } catch (e) {
          // skip if not found
        }
      }
      setParcels(fetched);
    } catch (err) {
      setError("Could not fetch parcels from the smart contract.");
    } finally {
      setIsParcelsLoading(false);
    }
  }, []);

  // Fetch total parcels and then all parcels
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

      setRegisterTxStatus("Awaiting confirmation in MetaMask...");
      const tx = await contract.registerParcel(
        ownerAddress,
        coordsHash,
        metadataURI,
        area
      );
      setRegisterTxStatus("Transaction sent! Waiting for confirmation...");
      await tx.wait();

      setRegisterTxStatus("Parcel registered successfully! 🎉");
      setOwnerAddress(account || "");
      setCoordinates("");
      setMetadataURI("");
      setArea("");
      fetchTotalParcels();
    } catch (err) {
      const errorObj = err as { reason?: string };
      console.error("Registration failed:", err);
      setRegisterTxStatus(`Error: ${errorObj.reason || "Transaction failed."}`);
    } finally {
      setIsRegistering(false);
      setTimeout(() => setRegisterTxStatus(""), 5000);
    }
  };

  // NEW: Handler for the transfer form submission
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

      setTransferTxStatus("Awaiting confirmation in MetaMask...");
      const tx = await contract.transferParcel(
        transferParcelId,
        transferToAddress
      );

      setTransferTxStatus("Transaction sent! Waiting for confirmation...");
      await tx.wait();

      setTransferTxStatus("Parcel transferred successfully! 🎉");
      setTransferParcelId("");
      setTransferToAddress("");
    } catch (err) {
      const errorObj = err as { reason?: string };
      console.error("Transfer failed:", err);
      setTransferTxStatus(`Error: ${errorObj.reason || "Transaction failed."}`);
    } finally {
      setIsTransferring(false);
      setTimeout(() => setTransferTxStatus(""), 5000);
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
          {error && (
            <div className="mt-4 bg-red-900/20 text-red-400 border border-red-900 rounded-lg p-3 text-center text-sm">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- UI ---
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 py-6">
      {/* Wallet and Actions */}
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

      {/* Registry Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold mb-2">Total Registered Parcels</h2>
          {isContractLoading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <span className="text-4xl font-bold text-indigo-400">
              {totalParcels ?? "N/A"}
            </span>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold mb-2">Parcels On Sale</h2>
          {isParcelsLoading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <span className="text-4xl font-bold text-green-400">
              {parcels.filter((p) => p.forSale).length}
            </span>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold mb-2">Your Parcels</h2>
          {isParcelsLoading ? (
            <p className="text-gray-400">Loading...</p>
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

      {/* All Parcels List */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">
          All Registered Parcels
        </h2>
        {isParcelsLoading ? (
          <div className="text-center text-gray-400">Loading parcels...</div>
        ) : parcels.length === 0 ? (
          <div className="text-center text-gray-400">
            No parcels registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parcels.map((parcel) => (
              <div
                key={parcel.id}
                className={`rounded-xl border-2 shadow-lg p-5 flex flex-col gap-2 transition-all ${
                  parcel.forSale
                    ? "border-green-500 bg-green-950/30"
                    : "border-gray-700 bg-gray-950/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">ID: {parcel.id}</span>
                  {parcel.forSale && (
                    <span className="px-2 py-1 bg-green-700 text-xs rounded text-white font-semibold">
                      FOR SALE
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm text-indigo-300 break-all">
                  Owner: {formatAddress(parcel.owner)}
                </div>
                <div className="text-sm text-gray-400">
                  Area:{" "}
                  <span className="font-semibold text-white">
                    {parcel.areaSqm} sqm
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  Coords Hash:{" "}
                  <span className="font-mono text-xs">{parcel.coordsHash}</span>
                </div>
                {parcel.metadataURI && (
                  <div className="text-xs text-blue-400 truncate">
                    Metadata:{" "}
                    <a
                      href={parcel.metadataURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {parcel.metadataURI}
                    </a>
                  </div>
                )}
                {parcel.forSale && (
                  <div className="text-sm text-green-400 font-bold">
                    Price: {parcel.price} ETH
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registration and Transfer Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Register New Parcel</h2>
          <p className="text-sm text-gray-400 pb-2">
            Only accounts with the{" "}
            <span className="font-mono bg-gray-700 px-1 rounded">
              REGISTRAR_ROLE
            </span>{" "}
            can perform this action.
          </p>
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
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
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
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 40.7128,-74.0060"
                required
              />
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
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
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
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md h-10 px-4 py-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isRegistering ? "Registering..." : "Register Parcel"}
            </button>
            {registerTxStatus && (
              <p className="text-sm text-center text-gray-400 pt-2">
                {registerTxStatus}
              </p>
            )}
          </form>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Transfer Parcel</h2>
          <p className="text-sm text-gray-400 pb-2">
            Only the current owner of a parcel can perform this action.
          </p>
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
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
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
                className="mt-1 w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isTransferring}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md h-10 px-4 py-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isTransferring ? "Transferring..." : "Transfer Ownership"}
            </button>
            {transferTxStatus && (
              <p className="text-sm text-center text-gray-400 pt-2">
                {transferTxStatus}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
