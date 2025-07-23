import React, { useState } from 'react';
import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
    FREIGHTER_ID,
  } from '@creit.tech/stellar-wallets-kit';
  
  const kit: StellarWalletsKit = new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,

    modules: allowAllModules(),
  });



const ConnectWalletButton: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { address } = await kit.getAddress();
      setAddress(address);
    } catch (e) {
      alert('Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await kit.disconnect();
    setAddress(null);
  };

  if (address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="text-gray-700 font-mono">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
          onClick={handleDisconnect}
        >
          Disconnect Wallet
        </button>
      </div>
    );
  }

  return (
    <button
      className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white px-6 py-2 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
      onClick={handleConnect}
      disabled={connecting}
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};

export default ConnectWalletButton; 