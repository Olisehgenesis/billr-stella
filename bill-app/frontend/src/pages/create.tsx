//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Plus, Minus, Save, Send, User, DollarSign, Hash, MessageSquare, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  useCreateInvoice, 
  useSendInvoice, 
  validateStellarAddress, 
  validateInvoiceId, 
  convertStroopsToUsdc,
  type InvoiceMetadata,
  debugInvoiceExists // <-- Add this import
} from '../hooks/useContract';
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  LOBSTR_ID,
  FreighterModule,
  LobstrModule
} from '@creit.tech/stellar-wallets-kit';

// Improved wallet kit configuration
const createWalletKit = () => {
  return new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: LOBSTR_ID, // Start with Freighter as it's more reliable
    modules: [
      new FreighterModule(),
      new LobstrModule()
    ],
  });
};

const kit = createWalletKit();

// Enhanced wallet hook with better error handling
function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Check for stored connection
    const checkConnection = async () => {
      try {
        const storedAddress = localStorage.getItem('stellar-wallet-address');
        if (storedAddress && validateStellarAddress(storedAddress)) {
          setAddress(storedAddress);
          setConnected(true);
        }
      } catch (error) {
        console.log('No previous wallet connection found');
      }
    };
    
    checkConnection();
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            setAddress(address);
            setConnected(true);
            
            // Store connection
            localStorage.setItem('stellar-wallet-address', address);
            localStorage.setItem('stellar-wallet-id', option.id);
          } catch (error) {
            console.error('Failed to get address:', error);
            throw error;
          }
        }
      });
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      
      if (error.message?.includes('User rejected')) {
        alert('Wallet connection was rejected by user');
      } else if (error.message?.includes('No wallet')) {
        alert('Please install a Stellar wallet extension (Freighter or Lobstr)');
      } else {
        alert('Failed to connect wallet: ' + (error.message || error));
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await kit.disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setAddress(null);
      setConnected(false);
      localStorage.removeItem('stellar-wallet-address');
      localStorage.removeItem('stellar-wallet-id');
    }
  };

  return { address, connected, connecting, connect, disconnect };
}

// Enhanced transaction signing with better error handling
const signTransactionSafely = async (transactionXdr: string, walletAddress: string) => {
  try {
    console.log('🔐 Signing transaction...');
    
    const networkPassphrase = 'Test SDF Network ; September 2015';
    
    const result = await kit.signTransaction(transactionXdr, {
      address: walletAddress,
      networkPassphrase: networkPassphrase
    });
    
    console.log('✅ Transaction signed successfully');
    return result;
    
  } catch (error: any) {
    console.error('❌ Signing error:', error);
    
    if (error.message?.includes('could not be cloned')) {
      // Try alternative signing method
      try {
        console.log('🔄 Trying alternative signing method...');
        const result = await kit.signTransaction(transactionXdr);
        console.log('✅ Alternative signing successful');
        return result;
      } catch (alternativeError) {
        console.error('❌ Alternative signing also failed:', alternativeError);
        throw new Error('Transaction signing failed: Wallet communication error. Please try refreshing the page and reconnecting your wallet.');
      }
    }
    
    throw error;
  }
};

// Enhanced transaction submission with retry logic
const submitTransaction = async (signedXdr: string) => {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`📤 Submitting transaction (attempt ${retryCount + 1}/${maxRetries})`);
      
      const response = await fetch('https://soroban-testnet.stellar.org/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Name': 'billr-invoice-app',
          'X-Client-Version': '2.0.0'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'sendTransaction',
          params: {
            transaction: signedXdr
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Stellar RPC Error: ${result.error.message}`);
      }

      console.log('✅ Transaction submitted successfully:', result);
      return result;
      
    } catch (error: any) {
      retryCount++;
      console.error(`❌ Submission attempt ${retryCount} failed:`, error);
      
      if (retryCount >= maxRetries) {
        throw new Error(`Transaction submission failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }
};

export default function CreateInvoicePage() {
  const [formData, setFormData] = useState({
    invoiceId: '',
    recipientAddress: '',
    amount: '',
    description: '',
    metadata: [{ key: '', value: '' }] as InvoiceMetadata[],
    includeItems: false,
    items: [{ name: '', quantity: 1, unitPrice: '', vatRate: 0 }]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { mutate: createInvoice, loading: creating, error: createError } = useCreateInvoice();
  const { mutate: sendInvoice, loading: sending, error: sendError } = useSendInvoice();
  const wallet = useWallet();

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const addMetadataField = () => {
    setFormData({
      ...formData,
      metadata: [...formData.metadata, { key: '', value: '' }]
    });
  };

  const removeMetadataField = (index: number) => {
    const newMetadata = formData.metadata.filter((_, i) => i !== index);
    setFormData({ ...formData, metadata: newMetadata });
  };

  const updateMetadataField = (index: number, field: keyof InvoiceMetadata, value: string) => {
    const newMetadata = formData.metadata.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setFormData({ ...formData, metadata: newMetadata });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, unitPrice: '', vatRate: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = formData.items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotal = (item: { quantity: number; unitPrice: string; vatRate: number }) => {
    const subtotal = (parseFloat(String(item.quantity)) || 0) * (parseFloat(item.unitPrice) || 0);
    const vat = subtotal * (parseFloat(String(item.vatRate)) || 0) / 100;
    return subtotal + vat;
  };

  // Update amount when items change
  useEffect(() => {
    if (formData.includeItems) {
      const grandTotal = formData.items.reduce((total, item) => {
        if (item.name && item.unitPrice) {
          return total + calculateItemTotal(item);
        }
        return total;
      }, 0);
      setFormData(prev => ({ ...prev, amount: grandTotal.toFixed(7) })); // 7 decimals for USDC precision
    }
  }, [formData.items, formData.includeItems]);

  const calculateGrandTotal = () => {
    if (!formData.includeItems) {
      return parseFloat(formData.amount) || 0;
    }
    return formData.items.reduce((total, item) => {
      if (item.name && item.unitPrice) {
        return total + calculateItemTotal(item);
      }
      return total;
    }, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Invoice ID validation
    if (!formData.invoiceId.trim()) {
      newErrors.invoiceId = 'Invoice ID is required';
    } else if (!validateInvoiceId(formData.invoiceId)) {
      newErrors.invoiceId = 'Invoice ID must be between 1-64 characters';
    }

    // Recipient address validation
    if (!formData.recipientAddress.trim()) {
      newErrors.recipientAddress = 'Recipient address is required';
    } else if (!validateStellarAddress(formData.recipientAddress)) {
      newErrors.recipientAddress = 'Please enter a valid Stellar address (starts with G)';
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      } else if (amount > 1000000) {
        newErrors.amount = 'Amount too large (max 1,000,000 USDC)';
      }
    }

    // Creator address validation (wallet must be connected)
    if (!wallet.address) {
      newErrors.wallet = 'Please connect your wallet';
    } else if (!validateStellarAddress(wallet.address)) {
      newErrors.wallet = 'Connected wallet address is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (action: 'save' | 'send') => {
    console.log(`🚀 Starting ${action} operation`);
    
    // Clear previous messages
    setSuccessMessage(null);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare metadata (same as before)
      let finalMetadata = [...formData.metadata.filter(m => m.key && m.value)];
      
      if (formData.includeItems) {
        formData.items.forEach((item, index) => {
          if (item.name) {
            finalMetadata.push(
              { key: `item_${index + 1}_name`, value: item.name },
              { key: `item_${index + 1}_quantity`, value: item.quantity.toString() },
              { key: `item_${index + 1}_unit_price`, value: item.unitPrice },
              { key: `item_${index + 1}_vat_rate`, value: item.vatRate.toString() },
              { key: `item_${index + 1}_total`, value: calculateItemTotal(item).toFixed(7) }
            );
          }
        });
        finalMetadata.push({ key: 'has_items', value: 'true' });
        finalMetadata.push({ key: 'items_count', value: formData.items.filter(i => i.name).length.toString() });
      }
      
      if (formData.description) {
        finalMetadata.push({ key: 'description', value: formData.description });
      }

      const metadataObj = finalMetadata.reduce((acc, cur) => {
        acc[cur.key] = cur.value;
        return acc;
      }, {} as Record<string, string>);

      console.log('📋 Creating invoice transaction...');

      // Create invoice transaction
      const createResult = await createInvoice({
        creator: wallet.address!,
        invoiceId: formData.invoiceId,
        recipient: formData.recipientAddress,
        amount: formData.amount,
        metadata: metadataObj
      });

      console.log('✅ Invoice transaction created');

      // Sign the transaction
      const { signedTxXdr } = await signTransactionSafely(createResult.raw, wallet.address!);
      
      // Submit the transaction
      const submitResult = await submitTransaction(signedTxXdr);
      
      let transactionHash = submitResult.result?.hash || 'N/A';
      
      console.log('✅ Create transaction submitted:', transactionHash);
      
      // If action is 'send', also send the invoice
      if (action === 'send') {
        console.log('⏳ Waiting 3 seconds before sending invoice...');
        
        // Wait a bit for the transaction to be confirmed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // DEBUG: Check if invoice exists
        const invoiceExists = await debugInvoiceExists(formData.invoiceId, wallet.address!);
        if (!invoiceExists) {
          throw new Error('Invoice was not saved properly. Please try again or use "Save as Draft" first.');
        }
        
        console.log('📤 Sending invoice...');
        
        const sendResult = await sendInvoice({
          creator: wallet.address!,
          invoiceId: formData.invoiceId
        });
        
        const { signedTxXdr: signedSendXdr } = await signTransactionSafely(sendResult.raw, wallet.address!);
        const sendSubmitResult = await submitTransaction(signedSendXdr);
        
        transactionHash = sendSubmitResult.result?.hash || transactionHash;
      }

      // Success (rest remains the same)
      setIsLoading(false);
      setSuccessMessage(
        `Invoice ${action === 'save' ? 'saved' : 'created and sent'} successfully! Transaction: ${transactionHash}`
      );
      
      // Reset form
      setFormData({
        invoiceId: '',
        recipientAddress: '',
        amount: '',
        description: '',
        metadata: [{ key: '', value: '' }],
        includeItems: false,
        items: [{ name: '', quantity: 1, unitPrice: '', vatRate: 0 }]
      });
      
      setErrors({});

    } catch (error: any) {
      console.error('❌ Invoice operation failed:', error);
      setIsLoading(false);
      
      // Enhanced error handling (same as before)
      let errorMessage = 'Failed to create invoice';
      
      if (error.message?.includes('InvoiceAlreadyExists')) {
        errorMessage = 'An invoice with this ID already exists. Please use a different Invoice ID.';
      } else if (error.message?.includes('InvalidAmount')) {
        errorMessage = 'Invalid amount. Amount must be greater than 0.';
      } else if (error.message?.includes('Unauthorized')) {
        errorMessage = 'Authorization failed. Please make sure your wallet is connected properly.';
      } else if (error.message?.includes('User declined') || error.message?.includes('rejected')) {
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.message?.includes('Wallet communication error')) {
        errorMessage = error.message;
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds in wallet for transaction fees';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again';
      } else if (error.message?.includes('Invalid creator address')) {
        errorMessage = 'Wallet address is invalid. Please reconnect your wallet.';
      } else if (error.message?.includes('Invalid recipient address')) {
        errorMessage = 'Recipient address is invalid. Please check the address format.';
      } else if (error.message?.includes('Invoice was not saved properly')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-green-200">
      {/* Success Banner */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-green-100 border border-green-300 rounded-xl p-4 shadow-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                    Billr
                  </h1>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {wallet.address ? (
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✅ Connected:</span>
                  <span className="font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                  <button
                    onClick={wallet.disconnect}
                    className="text-red-600 hover:text-red-700 ml-2"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white px-6 py-2 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
                  onClick={wallet.connect}
                  disabled={wallet.connecting}
                >
                  {wallet.connecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Create New Invoice</h2>
          <p className="text-gray-600">Fill out the details below to create your blockchain invoice</p>
        </div>

        {/* Validation Warnings */}
        {!wallet.address && (
          <div className="mb-8 p-6 bg-yellow-100 border border-yellow-300 rounded-xl text-yellow-800 text-center font-semibold flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Please connect your wallet to create an invoice.
          </div>
        )}

        {errors.wallet && (
          <div className="mb-8 p-6 bg-red-100 border border-red-300 rounded-xl text-red-800 text-center font-semibold flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {errors.wallet}
          </div>
        )}

        {(createError || sendError) && (
          <div className="mb-8 p-6 bg-red-100 border border-red-300 rounded-xl text-red-800 text-center font-semibold">
            <div className="flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {createError?.message || sendError?.message}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg p-8 border border-gray-100">
              <div className="space-y-6">
                {/* Invoice ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Invoice ID *
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceId}
                    onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:ring-0 ${
                      errors.invoiceId 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="INV-001"
                    maxLength={64}
                  />
                  {errors.invoiceId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.invoiceId}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Unique identifier for this invoice (max 64 characters)
                  </p>
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Recipient Address *
                  </label>
                  <input
                    type="text"
                    value={formData.recipientAddress}
                    onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:ring-0 font-mono text-sm ${
                      errors.recipientAddress 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  />
                  {errors.recipientAddress && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.recipientAddress}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Stellar public key starting with 'G' (56 characters)
                  </p>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Amount (USDC) *
                    {formData.includeItems && (
                      <span className="text-xs text-blue-600 ml-2">(Auto-calculated from items)</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0000001" // Support 7 decimal places for USDC
                      min="0"
                      max="1000000"
                      value={formData.amount}
                      onChange={(e) => !formData.includeItems && setFormData({ ...formData, amount: e.target.value })}
                      readOnly={formData.includeItems}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:ring-0 ${
                        formData.includeItems 
                          ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
                          : errors.amount 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-gray-200 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <span className="text-gray-500 font-medium">USDC</span>
                    </div>
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.amount}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum amount: 1,000,000 USDC (supports up to 7 decimal places)
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 transition-colors focus:outline-none focus:ring-0 resize-none"
                    placeholder="Brief description of the invoice..."
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional description (max 500 characters)
                  </p>
                </div>

                {/* Items Toggle - Same as before but with better validation */}
                <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-blue-600 mr-2" />
                      <label className="text-sm font-semibold text-gray-700">
                        Include Itemized List
                      </label>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.includeItems}
                        onChange={(e) => setFormData({ ...formData, includeItems: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-orange-500"></div>
                    </label>
                  </div>

                  {formData.includeItems && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-600">Add individual items with pricing</span>
                        <button
                          type="button"
                          onClick={addItem}
                          className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </button>
                      </div>

                      {/* Items table - same structure as before */}
                      <div className="space-y-4">
                        {formData.items.map((item, index) => {
                          const subtotal = (parseFloat(String(item.quantity)) || 0) * (parseFloat(item.unitPrice) || 0);
                          const vatAmount = subtotal * (parseFloat(String(item.vatRate)) || 0) / 100;
                          const itemTotal = subtotal + vatAmount;
                          
                          return (
                            <div key={index} className="bg-white rounded-xl border border-gray-200 p-4">
                              <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-4">
                                <label className="text-xs font-medium text-gray-700 mb-1 block">Item Name</label>
                                 <input
                                   type="text"
                                   placeholder="Enter item name"
                                   value={item.name}
                                   onChange={(e) => updateItem(index, 'name', e.target.value)}
                                   className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none"
                                 />
                               </div>
                               <div className="col-span-2">
                                 <label className="text-xs font-medium text-gray-700 mb-1 block">Qty</label>
                                 <input
                                   type="number"
                                   min="1"
                                   value={item.quantity}
                                   onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                                   className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none"
                                 />
                               </div>
                               <div className="col-span-2">
                                 <label className="text-xs font-medium text-gray-700 mb-1 block">Unit Price</label>
                                 <input
                                   type="number"
                                   step="0.0000001"
                                   placeholder="0.00"
                                   value={item.unitPrice}
                                   onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                   className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none"
                                 />
                               </div>
                               <div className="col-span-2">
                                 <label className="text-xs font-medium text-gray-700 mb-1 block">VAT %</label>
                                 <input
                                   type="number"
                                   step="0.1"
                                   min="0"
                                   max="100"
                                   value={item.vatRate}
                                   onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)}
                                   className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none"
                                 />
                               </div>
                               <div className="col-span-1">
                                 <label className="text-xs font-medium text-gray-700 mb-1 block">Total</label>
                                 <div className="text-sm font-semibold text-blue-600">
                                   ${itemTotal.toFixed(7)}
                                 </div>
                               </div>
                               <div className="col-span-1">
                                 {formData.items.length > 1 && (
                                   <button
                                     type="button"
                                     onClick={() => removeItem(index)}
                                     className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                     title="Remove item"
                                   >
                                     <Minus className="w-4 h-4" />
                                   </button>
                                 )}
                               </div>
                             </div>
                           </div>
                         );
                       })}
                     </div>

                     <div className="mt-4 p-4 bg-gradient-to-r from-blue-100 to-orange-100 rounded-xl">
                       <div className="flex justify-between items-center">
                         <span className="font-semibold text-gray-700">Grand Total:</span>
                         <span className="text-xl font-bold text-gray-800">${calculateGrandTotal().toFixed(7)} USDC</span>
                       </div>
                     </div>
                   </div>
                 )}
               </div>

               {/* Metadata Fields */}
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <label className="block text-sm font-semibold text-gray-700">
                     Additional Metadata
                   </label>
                   <button
                     type="button"
                     onClick={addMetadataField}
                     className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                   >
                     <Plus className="w-4 h-4 mr-1" />
                     Add Field
                   </button>
                 </div>

                 <div className="space-y-3">
                   {formData.metadata.map((item, index) => (
                     <div key={index} className="flex gap-3">
                       <input
                         type="text"
                         placeholder="Key"
                         value={item.key}
                         onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                         className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 transition-colors focus:outline-none focus:ring-0"
                         maxLength={100}
                       />
                       <input
                         type="text"
                         placeholder="Value"
                         value={item.value}
                         onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                         className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 transition-colors focus:outline-none focus:ring-0"
                         maxLength={500}
                       />
                       {formData.metadata.length > 1 && (
                         <button
                           type="button"
                           onClick={() => removeMetadataField(index)}
                           className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                         >
                           <Minus className="w-4 h-4" />
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
                 <p className="mt-2 text-xs text-gray-500">
                   Add custom key-value pairs for additional invoice information
                 </p>
               </div>
             </div>
           </div>
         </div>

         {/* Preview Card */}
         <div className="lg:col-span-1">
           <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg p-6 border border-gray-100 sticky top-8">
             <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Preview</h3>
             
             <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-2xl p-6 mb-6">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center">
                   <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg mr-2"></div>
                   <span className="font-semibold text-gray-800">
                     {formData.invoiceId || 'Invoice ID'}
                   </span>
                 </div>
                 <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                   Draft
                 </span>
               </div>
               
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-600">To:</span>
                   <span className="font-medium text-gray-800 break-all text-right max-w-32">
                     {formData.recipientAddress ? 
                       `${formData.recipientAddress.slice(0, 6)}...${formData.recipientAddress.slice(-4)}` : 
                       'Recipient Address'
                     }
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-600">Amount:</span>
                   <span className="font-semibold text-gray-800">
                     {formData.amount ? `${parseFloat(formData.amount).toFixed(7)}` : '0.0000000'} USDC
                   </span>
                 </div>
                 {formData.description && (
                   <div className="pt-2 border-t border-gray-200">
                     <p className="text-gray-600 text-xs">{formData.description.slice(0, 100)}{formData.description.length > 100 ? '...' : ''}</p>
                   </div>
                 )}
                 
                 {formData.includeItems && formData.items.some(item => item.name) && (
                   <div className="pt-2 border-t border-gray-200">
                     <p className="text-gray-600 text-xs font-medium mb-2">Items:</p>
                     {formData.items.filter(item => item.name).map((item, index) => (
                       <div key={index} className="text-xs text-gray-600 mb-1 flex justify-between">
                         <span>{item.name} ({item.quantity}x)</span>
                         <span>${calculateItemTotal(item).toFixed(7)}</span>
                       </div>
                     ))}
                   </div>
                 )}

                 {formData.metadata.filter(m => m.key && m.value).length > 0 && (
                   <div className="pt-2 border-t border-gray-200">
                     <p className="text-gray-600 text-xs font-medium mb-2">Metadata:</p>
                     {formData.metadata.filter(m => m.key && m.value).slice(0, 3).map((item, index) => (
                       <div key={index} className="text-xs text-gray-600 mb-1">
                         <span className="font-medium">{item.key}:</span> {item.value.slice(0, 20)}{item.value.length > 20 ? '...' : ''}
                       </div>
                     ))}
                     {formData.metadata.filter(m => m.key && m.value).length > 3 && (
                       <div className="text-xs text-gray-500">
                         +{formData.metadata.filter(m => m.key && m.value).length - 3} more
                       </div>
                     )}
                   </div>
                 )}
               </div>
             </div>

             {/* Action Buttons */}
             <div className="space-y-3">
               <button
                 onClick={() => handleSubmit('save')}
                 disabled={isLoading || creating || sending || !wallet.address}
                 className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
               >
                 {(isLoading || creating) ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                     Creating...
                   </>
                 ) : (
                   <>
                     <Save className="w-5 h-5 mr-2" />
                     Save as Draft
                   </>
                 )}
               </button>

               <button
                 onClick={() => handleSubmit('send')}
                 disabled={isLoading || creating || sending || !wallet.address}
                 className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 disabled:text-gray-400 px-4 py-3 rounded-xl font-semibold border-2 border-gray-200 disabled:border-gray-200 transition-all hover:border-blue-300 hover:shadow-lg disabled:hover:border-gray-200 disabled:hover:shadow-none flex items-center justify-center disabled:cursor-not-allowed"
               >
                 {(isLoading || sending) ? (
                   <>
                     <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                     Sending...
                   </>
                 ) : (
                   <>
                     <Send className="w-5 h-5 mr-2" />
                     Create & Send
                   </>
                 )}
               </button>
               
               {/* Contract Address Info */}
               <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                 <div className="text-xs text-gray-600">
                   <div className="font-semibold mb-1">Contract:</div>
                   <div className="font-mono text-xs break-all">CAI4JQ...KJIKEA</div>
                   <div className="mt-1 text-gray-500">Stellar Testnet</div>
                 </div>
               </div>
             </div>

             {/* Status Info */}
             <div className="mt-6 p-4 bg-blue-50 rounded-xl">
               <h4 className="text-sm font-semibold text-blue-800 mb-2">Invoice Status Flow</h4>
               <div className="space-y-1 text-xs text-blue-700">
                 <div className="flex items-center">
                   <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                   <span>Draft → Edit freely</span>
                 </div>
                 <div className="flex items-center">
                   <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                   <span>Sent → Awaiting acknowledgment</span>
                 </div>
                 <div className="flex items-center">
                   <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                   <span>Acknowledged → Ready for payment</span>
                 </div>
                 <div className="flex items-center">
                   <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                   <span>Paid → Completed</span>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
}