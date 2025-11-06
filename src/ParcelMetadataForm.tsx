import React, { useState } from "react";
import { uploadParcelAssets } from "./ipfs";

interface ParcelMetadataFormProps {
  onReady: (metadataUrl: string) => void; // you will pass this to registerParcel as metadataURI
}

const ParcelMetadataForm: React.FC<ParcelMetadataFormProps> = ({ onReady }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Uploading to IPFS...");
    try {
      const coords =
        lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined;

      const res = await uploadParcelAssets({
        imageFile: imageFile || undefined,
        name: name || undefined,
        description: description || undefined,
        coordinates: coords,
        areaSqm: areaSqm || undefined,
      });

      setStatus("Metadata uploaded.");
      onReady(res.metadataUrl); // return gateway URL for contract.registerParcel
    } catch (err: any) {
      setStatus(`Error: ${err?.message || String(err)}`);
    }
  };

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Area (sqm)
          </label>
          <input
            className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2"
            value={areaSqm}
            onChange={(e) => setAreaSqm(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Latitude
          </label>
          <input
            className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="17.3850"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Longitude
          </label>
          <input
            className="mt-1 w-full bg-white border-2 border-black rounded-2xl p-2"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="78.4867"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="text-gray-700"
        />
      </div>

      <button
        type="submit"
        className="relative w-full inline-flex items-center justify-center rounded-2xl border-2 border-black bg-black px-4 py-2 text-base font-medium text-white transition-all hover:-translate-y-0.5"
      >
        Upload Metadata to IPFS
      </button>

      {status && <p className="text-sm text-gray-700">{status}</p>}
    </form>
  );
};

export default ParcelMetadataForm;
