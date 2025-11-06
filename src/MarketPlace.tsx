import React, { useEffect, useMemo, useState } from "react";
import { formatAddress } from "./lib/utils";

type Meta = {
  image?: string;
  image_url?: string;
  coordinates?: { lat: number; lng: number };
  areaSqm?: string;
  name?: string;
  description?: string;
};

// Small fetch helper that tolerates ipfs:// and http(s)
function normalizeUrl(u?: string) {
  if (!u) return undefined;
  if (u.startsWith("ipfs://"))
    return u.replace("ipfs://", "http://127.0.0.1:8080/ipfs/");
  return u;
}

function useParcelMetadata(uri?: string) {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (!uri) {
          setMeta(null);
          return;
        }
        const url = normalizeUrl(uri);
        const res = await fetch(url!);
        const json = (await res.json()) as Meta;
        if (!ignore) setMeta(json);
      } catch {
        if (!ignore) setMeta(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [uri]);
  return meta;
}

type Parcel = {
  id: string;
  owner: string;
  coordsHash: string;
  metadataURI: string;
  areaSqm: string;
  forSale: boolean;
  price: string | null; // in ETH (formatted)
  rawPrice: string | null; // in wei (string)
};

interface MarketplaceProps {
  parcels: Parcel[];
  account: string;
  isLoading?: boolean;
  onBuy: (parcel: Parcel) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({
  parcels,
  account,
  isLoading,
  onBuy,
}) => {
  const items = useMemo(
    () => parcels.filter((p) => p.forSale && p.price && p.rawPrice),
    [parcels]
  );

  // Small child component so hooks can be used per-card safely
  const ParcelCard: React.FC<{
    p: Parcel;
    account: string;
    onBuy: (parcel: Parcel) => void;
  }> = ({ p, account, onBuy }) => {
    const meta = useParcelMetadata(p.metadataURI);
    const imgSrc = normalizeUrl(meta?.image_url || meta?.image);
    const coords = meta?.coordinates;

    return (
      <div className="group relative rounded-2xl border-2 border-black bg-white p-4 transition-transform hover:-translate-y-0.5">
        <div className="h-36 rounded-xl bg-white border-2 border-black flex items-center justify-center mb-3 overflow-hidden">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={`Parcel ${p.id}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-600">Parcel #{p.id}</span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Owner</span>
            <span className="font-mono text-sm text-blue-600">
              {formatAddress(p.owner)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              Coordinates
            </span>
            {coords ? (
              <span className="font-mono text-[11px] text-gray-700">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            ) : (
              <span className="font-mono text-[11px] text-gray-700 truncate max-w-[160px]">
                {p.coordsHash}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Area</span>
            <span className="text-sm text-black">{p.areaSqm} sqm</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Price</span>
            <span className="text-base font-bold text-green-700">
              {p.price} ETH
            </span>
          </div>
        </div>

        <button
          onClick={() => onBuy(p)}
          disabled={
            !p.rawPrice || account?.toLowerCase() === p.owner.toLowerCase()
          }
          className="mt-4 relative w-full inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:opacity-50"
        >
          {account?.toLowerCase() === p.owner.toLowerCase()
            ? "Your Parcel"
            : `Buy for ${p.price} ETH`}
          <span className="pointer-events-none absolute inset-0 rounded-2xl [mask-image:linear-gradient(to_bottom,rgba(255,255,255,0.25),transparent_60%)]" />
        </button>

        {coords && (
          <div className="mt-2">
            <iframe
              title={`map-${p.id}`}
              src={`https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=14&output=embed`}
              className="w-full h-40 rounded-xl border-2 border-black"
              loading="lazy"
            />
          </div>
        )}

        {p.metadataURI && (
          <a
            href={p.metadataURI}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-xs underline text-gray-700"
          >
            View Metadata
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="absolute inset-0 rounded-3xl pointer-events-none [mask-image:linear-gradient(black,transparent)] bg-gradient-to-b from-black/5 to-transparent" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-black">Marketplace</h2>
          <span className="text-sm text-gray-600">
            {isLoading ? "Loading…" : `${items.length} on sale`}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border-2 border-black/10 bg-white p-4"
              >
                <div className="h-36 rounded-xl bg-gray-100 border-2 border-black/10 mb-3" />
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-1/3 bg-gray-200 rounded mb-4" />
                <div className="h-10 w-full bg-gray-200 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-600 py-10">
            No parcels are listed for sale right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <ParcelCard key={p.id} p={p} account={account} onBuy={onBuy} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
