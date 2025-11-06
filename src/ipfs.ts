// Local IPFS helper (Kubo/go-ipfs). No backend, no Infura.
// Provides: uploadFileToIPFS, uploadJSONToIPFS, uploadParcelAssets (image + metadata).
const env = import.meta.env as Record<string, string | undefined>;
const IPFS_API_URL = (
  env.VITE_IPFS_API_URL || "http://127.0.0.1:5001/api/v0"
).replace(/\/$/, "");
const GATEWAY = (
  env.VITE_IPFS_GATEWAY_URL || "http://127.0.0.1:8081/ipfs"
).replace(/\/$/, "");

type Coords = { lat: number; lng: number };

export type ParcelMetadata = {
  name?: string;
  description?: string;
  image?: string; // ipfs://CID or gateway URL
  image_url?: string; // gateway URL for convenience
  coordinates?: Coords;
  areaSqm?: string;
  attributes?: Record<string, unknown>;
};

async function getClient() {
  const { create } = await import("ipfs-http-client");
  return create({ url: IPFS_API_URL });
}

export async function uploadFileToIPFS(
  file: File
): Promise<{ cid: string; url: string; ipfsUri: string }> {
  const client = await getClient();
  const added = await client.add(file as unknown as Blob);
  const cid = (added as any).cid?.toString?.() || (added as any).path;
  if (!cid) throw new Error("Local IPFS returned no CID");
  return { cid, url: `${GATEWAY}/${cid}`, ipfsUri: `ipfs://${cid}` };
}

export async function uploadJSONToIPFS(
  obj: object,
  filename = "metadata.json"
): Promise<{ cid: string; url: string; ipfsUri: string }> {
  const client = await getClient();
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });
  const added = await client.add(file as unknown as Blob);
  const cid = (added as any).cid?.toString?.() || (added as any).path;
  if (!cid) throw new Error("Local IPFS returned no CID for JSON");
  return { cid, url: `${GATEWAY}/${cid}`, ipfsUri: `ipfs://${cid}` };
}

/**
 * Uploads image (optional) + metadata JSON with coords/area/etc.
 * Returns a metadataURI (gateway URL) you can store in the contract.
 */
export async function uploadParcelAssets(opts: {
  imageFile?: File;
  name?: string;
  description?: string;
  coordinates?: Coords; // { lat, lng }
  areaSqm?: string;
  attributes?: Record<string, unknown>;
}): Promise<{
  metadataUrl: string;
  metadataIpfsUri: string;
  imageUrl?: string;
  imageIpfsUri?: string;
}> {
  let imageUrl: string | undefined;
  let imageIpfsUri: string | undefined;

  if (opts.imageFile) {
    const img = await uploadFileToIPFS(opts.imageFile);
    imageUrl = img.url;
    imageIpfsUri = img.ipfsUri;
  }

  const metadata: ParcelMetadata = {
    name: opts.name,
    description: opts.description,
    coordinates: opts.coordinates,
    areaSqm: opts.areaSqm,
    attributes: opts.attributes,
  };

  // Prefer ipfs:// in "image", include gateway mirror in "image_url" for easy <img src>
  if (imageIpfsUri) metadata.image = imageIpfsUri;
  if (imageUrl) metadata.image_url = imageUrl;

  const meta = await uploadJSONToIPFS(metadata);
  return {
    metadataUrl: meta.url,
    metadataIpfsUri: meta.ipfsUri,
    imageUrl,
    imageIpfsUri,
  };
}
