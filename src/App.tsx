import { useState, useEffect } from "react";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";

export default function App() {
  const [account, setAccount] = useState<string | null>(() => {
    const saved = localStorage.getItem("lastConnectedAccount");
    return saved || null;
  });

  // Save the account to localStorage whenever it changes
  useEffect(() => {
    if (account) {
      localStorage.setItem("lastConnectedAccount", account);
    } else {
      localStorage.removeItem("lastConnectedAccount");
    }
  }, [account]);

  return (
    <div className="bg-white min-h-screen font-sans">
      <div className="container mx-auto">
        {/* <header className="pt-8 pb-6 border-b border-gray-100">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-center">
            BlockTerritory
          </h1>
        </header> */}
        <main>
          {account ? (
            <HomePage
              initialAccount={account}
              onDisconnect={() => setAccount(null)}
            />
          ) : (
            <LoginPage onLogin={setAccount} />
          )}
        </main>
      </div>
    </div>
  );
}
