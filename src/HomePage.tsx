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
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [actionStatus, setActionStatus] = useState<string>("");
  const [listPrice, setListPrice] = useState<string>("");
  const [metadataEdit, setMetadataEdit] = useState<string>("");
  const [coordsSearch, setCoordsSearch] = useState<string>("");
  const [coordsSearchResult, setCoordsSearchResult] = useState<Parcel | null>(
    null
  );
  // List parcel for sale
  const handleListForSale = async (parcelId: string) => {
    if (!window.ethereum || !listPrice) return;
    setActionStatus("Listing for sale...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const tx = await contract.listParcelForSale(parcelId, listPrice);
      setActionStatus("Waiting for confirmation...");
      await tx.wait();
      setActionStatus("Parcel listed for sale!");
      fetchTotalParcels();
    } catch (err: any) {
      setActionStatus("Error: " + (err?.reason || err?.message || "Failed"));
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  // Cancel sale
  const handleCancelSale = async (parcelId: string) => {
    if (!window.ethereum) return;
    setActionStatus("Cancelling sale...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const tx = await contract.cancelSale(parcelId);
      setActionStatus("Waiting for confirmation...");
      await tx.wait();
      setActionStatus("Sale cancelled!");
      fetchTotalParcels();
    } catch (err: any) {
      setActionStatus("Error: " + (err?.reason || err?.message || "Failed"));
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  // Buy parcel
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
      setActionStatus("Waiting for confirmation...");
      await tx.wait();
      setActionStatus("Parcel bought!");
      fetchTotalParcels();
    } catch (err: any) {
      setActionStatus("Error: " + (err?.reason || err?.message || "Failed"));
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  // Update metadata URI
  const handleUpdateMetadata = async (parcelId: string) => {
    if (!window.ethereum || !metadataEdit) return;
    setActionStatus("Updating metadata URI...");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);
      const tx = await contract.updateMetadataURI(parcelId, metadataEdit);
      setActionStatus("Waiting for confirmation...");
      await tx.wait();
      setActionStatus("Metadata updated!");
      fetchTotalParcels();
    } catch (err: any) {
      setActionStatus("Error: " + (err?.reason || err?.message || "Failed"));
    } finally {
      setTimeout(() => setActionStatus(""), 4000);
    }
  };

  // Search by coordsHash
  const handleCoordsSearch = async () => {
    setCoordsSearchResult(null);
    setActionStatus("");
    if (!coordsSearch || !window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(contractAddress, contractABI, provider);
      const id = await contract.getParcelIdByCoords(coordsSearch);
      if (id && id.toString() !== "0") {
        const parcel = await contract.getParcel(id);
        setCoordsSearchResult({
          id: parcel.id.toString(),
          owner: parcel.owner,
          coordsHash: parcel.coordsHash,
          metadataURI: parcel.metadataURI,
          areaSqm: parcel.areaSqm.toString(),
          forSale: parcel.forSale,
          price: parcel.price ? ethers.formatEther(parcel.price) : null,
          rawPrice: parcel.price ? parcel.price.toString() : null,
        });
      } else {
        setActionStatus("No parcel found for this coords hash.");
      }
    } catch (err: any) {
      setActionStatus("Error: " + (err?.reason || err?.message || "Failed"));
    }
  };
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
            price: parcel.price ? ethers.formatEther(parcel.price) : null,
            rawPrice: parcel.price ? parcel.price.toString() : null,
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

      {/* Search by Coords Hash */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-2">Search Parcel by Coords Hash</h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Enter coords hash (0x...)"
            value={coordsSearch}
            onChange={(e) => setCoordsSearch(e.target.value)}
            className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleCoordsSearch}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-4 py-2"
          >
            Search
          </button>
        </div>
        {coordsSearchResult && (
          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-1">Parcel found:</div>
            <div className="bg-gray-800 rounded p-3">
              <span className="font-mono text-indigo-400">
                ID: {coordsSearchResult.id}
              </span>{" "}
              |{" "}
              <span className="font-mono text-blue-300">
                Owner: {coordsSearchResult.owner}
              </span>
            </div>
          </div>
        )}
        {actionStatus && (
          <div className="mt-2 text-red-400 text-sm">{actionStatus}</div>
        )}
      </div>

      {/* All Parcels List as Table/List */}
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
                    For Sale
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">
                    Price (wei)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {parcels.map((parcel) => (
                  <tr
                    key={parcel.id}
                    className={`hover:bg-gray-800 cursor-pointer transition-all ${
                      selectedParcel?.id === parcel.id ? "bg-indigo-950/40" : ""
                    }`}
                    onClick={() => setSelectedParcel(parcel)}
                  >
                    <td className="px-3 py-2 text-sm text-indigo-300 font-mono">
                      {parcel.id}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-blue-200">
                      {formatAddress(parcel.owner)}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-400 truncate max-w-[120px]">
                      {parcel.coordsHash}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {parcel.forSale ? (
                        <span className="text-green-400 font-bold">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {parcel.forSale && parcel.rawPrice
                        ? parcel.rawPrice
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Parcel Details Panel with Actions */}
      {selectedParcel && (
        <div className="bg-gray-900 border border-indigo-700 rounded-xl p-6 mt-4 max-w-2xl mx-auto shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-indigo-300">
              Parcel Details
            </h3>
            <button
              onClick={() => setSelectedParcel(null)}
              className="text-gray-400 hover:text-red-400 text-lg"
            >
              &times;
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <span className="font-semibold text-gray-300">ID:</span>{" "}
              <span className="font-mono text-indigo-400">
                {selectedParcel.id}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">Owner:</span>{" "}
              <span className="font-mono text-blue-300">
                {selectedParcel.owner}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">Coords Hash:</span>{" "}
              <span className="font-mono text-xs">
                {selectedParcel.coordsHash}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">Area (sqm):</span>{" "}
              <span className="text-white">{selectedParcel.areaSqm}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">For Sale:</span>{" "}
              {selectedParcel.forSale ? (
                <span className="text-green-400 font-bold">Yes</span>
              ) : (
                <span className="text-gray-400">No</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-gray-300">Price (wei):</span>{" "}
              {selectedParcel.forSale && selectedParcel.rawPrice ? (
                <span className="text-green-300 font-mono">
                  {selectedParcel.rawPrice}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-gray-300">Price (ETH):</span>{" "}
              {selectedParcel.forSale && selectedParcel.price ? (
                <span className="text-green-300 font-mono">
                  {selectedParcel.price}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            {selectedParcel.metadataURI && (
              <div>
                <span className="font-semibold text-gray-300">
                  Metadata URI:
                </span>{" "}
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
          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            {/* List for Sale (if owner and not for sale) */}
            {account?.toLowerCase() === selectedParcel.owner.toLowerCase() &&
              !selectedParcel.forSale && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleListForSale(selectedParcel.id);
                  }}
                  className="flex gap-2 items-center"
                >
                  <input
                    type="number"
                    min="1"
                    placeholder="Price in wei"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    className="bg-gray-800 border-gray-600 rounded-md p-2 text-white w-32"
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
            {/* Cancel Sale (if owner and for sale) */}
            {account?.toLowerCase() === selectedParcel.owner.toLowerCase() &&
              selectedParcel.forSale && (
                <button
                  onClick={() => handleCancelSale(selectedParcel.id)}
                  className="bg-yellow-700 hover:bg-yellow-800 text-white rounded-md px-3 py-2 font-medium"
                >
                  Cancel Sale
                </button>
              )}
            {/* Buy (if not owner and for sale) */}
            {account?.toLowerCase() !== selectedParcel.owner.toLowerCase() &&
              selectedParcel.forSale && (
                <button
                  onClick={() => handleBuyParcel(selectedParcel)}
                  className="bg-blue-700 hover:bg-blue-800 text-white rounded-md px-3 py-2 font-medium"
                >
                  Buy Parcel
                </button>
              )}
            {/* Update Metadata (if owner) */}
            {account?.toLowerCase() === selectedParcel.owner.toLowerCase() && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateMetadata(selectedParcel.id);
                }}
                className="flex gap-2 items-center"
              >
                <input
                  type="text"
                  placeholder="New Metadata URI"
                  value={metadataEdit}
                  onChange={(e) => setMetadataEdit(e.target.value)}
                  className="bg-gray-800 border-gray-600 rounded-md p-2 text-white w-48"
                  required
                />
                <button
                  type="submit"
                  className="bg-indigo-700 hover:bg-indigo-800 text-white rounded-md px-3 py-2 font-medium"
                >
                  Update Metadata
                </button>
              </form>
            )}
          </div>
          {actionStatus && (
            <div className="mt-3 text-indigo-300 text-sm">{actionStatus}</div>
          )}
        </div>
      )}

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
