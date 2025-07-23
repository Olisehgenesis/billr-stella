//@ts-nocheck
import React from 'react';
import { FileText } from 'lucide-react';
import ConnectWalletButton from './ConnectWalletButton';

const Header = () => (
  <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              Billr
            </h1>
            <p className="text-xs text-gray-500">Blockchain Invoicing</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors">
            Features
          </button>
          <button className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors">
            About
          </button>
          <a href="/create" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors">
            Create
          </a>
          <a href="/invoices" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors">
            Dashboard
          </a>
          <ConnectWalletButton />
        </div>
      </div>
    </div>
  </nav>
);

export default Header;
