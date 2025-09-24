// import React from "react";
import HomePage from "./HomePage";

export default function App() {
  return (
    <div className="bg-gray-950 min-h-screen font-sans p-4 sm:p-6 md:p-8 text-white">
      <div className="container mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">
            Decentralized Land Registry
          </h1>
          <p className="text-gray-400 mt-2 text-center">
            Built on the Ethereum Blockchain
          </p>
        </header>
        <main>
          <HomePage />
        </main>
      </div>
    </div>
  );
}
