// // src/utils/ipfs.tsx
// import { create } from "ipfs-http-client";

// // Connect to *local* IPFS daemon (make sure `ipfs daemon` is running)
// const client = create({ url: "http://127.0.0.1:5001/api/v0" });

// /**
//  * Upload a file to local IPFS node and return the gateway URL
//  */
// export const uploadToIPFS = async (file: File): Promise<string> => {
//   try {
//     const added = await client.add(file);
//     // Local gateway URL
//     return `http://127.0.0.1:8080/ipfs/${added.path}`;
//   } catch (err) {
//     console.error("IPFS upload error:", err);
//     throw err;
//   }
// };

// const API_BASE_URL = "https://blockchain-backend-b30t.onrender.com"; // Flask server
const API_BASE_URL = "http://127.0.0.1:5000"; // Flask server

/**
 * Upload a file to Flask backend, which stores it in IPFS,
 * and return the metadata URL (gateway link).
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Construct metadata URL (can be public IPFS gateway or your Flask fetch route)
    const metadataUrl = `https://ipfs.io/ipfs/${data.cid}`;
    console.log(metadataUrl)

    return metadataUrl;
  } catch (err) {
    console.error("IPFS upload error via Flask:", err);
    throw err;
  }
};
