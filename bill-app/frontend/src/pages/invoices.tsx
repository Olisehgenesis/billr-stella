//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Eye, 
  Send, 
  CheckCircle, 
  DollarSign, 
  Calendar, 
  User, 
  Package, 
  MessageSquare,
  Hash,
  X,
  Copy,
  ExternalLink,
  AlertCircle,
  Clock,
  Ban,
  RefreshCw,
  Plus,
  Filter,
  Inbox,
  Archive,
  Trash2,
  Receipt,
  HandHeart
} from 'lucide-react';
import { 
  useGetInvoice,
  useGetAllInvoicesForAddress,
  useGetInvoicesByCreator,
  useGetInvoicesByRecipient,
  validateStellarAddress,
  convertStroopsToUsdc,
  useAcknowledgeInvoice,
  usePayInvoiceWithUsdcTransfer,
  useApproveUsdcSpending
} from '../hooks/useContract';
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  LOBSTR_ID,
  FreighterModule,
  LobstrModule
} from '@creit.tech/stellar-wallets-kit';

// Enhanced wallet setup
const createWalletKit = () => {
  return new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: LOBSTR_ID,
    modules: [
      new FreighterModule(),
      new LobstrModule()
    ],
  });
};

const kit = createWalletKit();

// Enhanced transaction signing
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

// Enhanced transaction submission
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
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }
};

// Enhanced wallet hook
function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
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
      alert('Failed to connect wallet: ' + (error.message || error));
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

// Enhanced Status Badge
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Draft':
        return { bg: 'bg-orange-100', text: 'text-orange-800', icon: Clock, border: 'border-orange-200' };
      case 'Sent':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Send, border: 'border-blue-200' };
      case 'Acknowledged':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: CheckCircle, border: 'border-yellow-200' };
      case 'Paid':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: DollarSign, border: 'border-green-200' };
      case 'Cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: Ban, border: 'border-red-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle, border: 'border-gray-200' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="w-4 h-4 mr-2" />
      {status}
    </span>
  );
};

// Copy to clipboard utility
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Enhanced Invoice Modal
const InvoiceModal = ({ 
  invoiceId, 
  isOpen, 
  onClose, 
  walletAddress,
  onRefresh 
}: { 
  invoiceId: string | null; 
  isOpen: boolean; 
  onClose: () => void;
  walletAddress: string | null;
  onRefresh: () => void;
}) => {
  const { mutate: getInvoice, loading, error } = useGetInvoice();
  const { mutate: acknowledgeInvoice, loading: acknowledging } = useAcknowledgeInvoice();
  const { mutate: payInvoiceWithUsdcTransfer, loading: paying } = usePayInvoiceWithUsdcTransfer();
  const { mutate: approveUsdc, loading: approving, error: approveError } = useApproveUsdcSpending();
  const [trustlineStep, setTrustlineStep] = useState<null | { tx: any }> (null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approvalStep, setApprovalStep] = useState<'idle' | 'approving' | 'approved'>('idle');
  const [approveMessage, setApproveMessage] = useState<string | null>(null);

  // Helper to convert invoice amount to stroops
  const getInvoiceAmountStroops = () => {
    if (!invoiceData) return '0';
    return invoiceData.amount;
  };

  const handleApprove = async () => {
    setActionError(null);
    setApproveMessage(null);
    if (!walletAddress || !invoiceData) return;
    try {
      setApprovalStep('approving');
      setApproveMessage('Preparing approval transaction...');
      const approveTx = await approveUsdc({
        owner: walletAddress,
        amount: getInvoiceAmountStroops(),
      });
      //log the steps
      console.log('🔍 Approval step:', approvalStep);
      const { signedTxXdr } = await signTransactionSafely(approveTx.raw, walletAddress);
      await submitTransaction(signedTxXdr);
      setApproveMessage('Approval successful! You can now pay the invoice.');
      setApprovalStep('approved');
    } catch (err: any) {
      setActionError(err.message);
      setApprovalStep('idle');
    }
  };

  const refreshInvoice = async () => {
    if (invoiceId && walletAddress) {
      try {
        const data = await getInvoice(invoiceId, walletAddress);
        setInvoiceData(data);
      } catch (err) {
        // error handled by hook
      }
    }
  };

  useEffect(() => {
    if (isOpen && invoiceId && walletAddress) {
      refreshInvoice();
      setActionError(null);
      setSuccessMessage(null);
    }
    // eslint-disable-next-line
  }, [isOpen, invoiceId, walletAddress]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCopy = async (text: string, type: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // Enhanced action handlers with transaction signing
  const handleSend = async () => {
    setActionError(null);
    if (!walletAddress || !invoiceData) return;
    try {
      const result = await acknowledgeInvoice({
        recipient: walletAddress,
        invoiceId: invoiceData.invoice_id
      });
      
      const { signedTxXdr } = await signTransactionSafely(result.raw, walletAddress);
      await submitTransaction(signedTxXdr);
      
      setSuccessMessage('Invoice sent successfully!');
      await refreshInvoice();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAcknowledge = async () => {
    setActionError(null);
    if (!walletAddress || !invoiceData) return;
    try {
      const result = await acknowledgeInvoice({
        recipient: walletAddress,
        invoiceId: invoiceData.invoice_id
      });

      const { signedTxXdr } = await signTransactionSafely(result.raw, walletAddress);
      await submitTransaction(signedTxXdr);
      
      setSuccessMessage('Invoice acknowledged successfully!');
      await refreshInvoice();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handlePay = async () => {
    setActionError(null);
    if (!walletAddress || !invoiceData) return;
    // await handleApprove();
    try {
      setSuccessMessage('Preparing payment transaction...');
      const payTx = await payInvoiceWithUsdcTransfer({
        recipient: walletAddress,
        invoiceId: invoiceData.invoice_id,
        invoice: invoiceData
      });
      const { signedTxXdr } = await signTransactionSafely(payTx.raw, walletAddress);
      await submitTransaction(signedTxXdr);
      setSuccessMessage('Payment completed successfully!');
      await refreshInvoice();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAcknowledgeAndPay = async () => {
    setActionError(null);
    if (!walletAddress || !invoiceData) return;
    if (approvalStep !== 'approved') {
      setActionError('Please approve USDC spending before paying.');
      return;
    }
    try {
      // First acknowledge
      const ackResult = await acknowledgeInvoice({
        recipient: walletAddress,
        invoiceId: invoiceData.invoice_id
      });

      const { signedTxXdr: ackSignedXdr } = await signTransactionSafely(ackResult.raw, walletAddress);
      await submitTransaction(ackSignedXdr);

      // Then pay
      const payResult = await payInvoiceWithUsdcTransfer({
        recipient: walletAddress,
        invoiceId: invoiceData.invoice_id,
        invoice: invoiceData
      });

      const { signedTxXdr: paySignedXdr } = await signTransactionSafely(payResult.raw, walletAddress);
      await submitTransaction(paySignedXdr);
      
      setSuccessMessage('Invoice acknowledged and paid successfully!');
      await refreshInvoice();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Role/status logic
  const isCreator = invoiceData && walletAddress === invoiceData.creator;
  const isRecipient = invoiceData && walletAddress === invoiceData.recipient;
  let status = invoiceData?.status;
  if (Array.isArray(status)) status = status[0];

  // Button visibility logic
  const showSend = isCreator && status === 'Draft';
  const showDelete = isCreator && status === 'Draft'; // Only draft invoices can be "deleted" (cancelled)
  const showAcknowledge = isRecipient && status === 'Sent';
  const showAcknowledgeAndPay = isRecipient && status === 'Sent';
  const showPay = isRecipient && status === 'Acknowledged';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Success Message */}
        {successMessage && (
          <div className="absolute top-4 right-4 z-50 max-w-sm">
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 shadow-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium text-sm">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 px-8 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
              <Receipt className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Invoice Details</h2>
              <p className="text-white/80 text-sm">Blockchain Invoice Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mr-4" />
              <span className="text-xl font-medium text-gray-700">Loading invoice...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-800 mb-3">Failed to Load Invoice</h3>
              <p className="text-red-700 mb-6 text-lg">{error.message}</p>
              <button
                onClick={refreshInvoice}
                className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

          {invoiceData && (
            <div className="space-y-8">
              {/* Enhanced Invoice Header */}
              <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 rounded-3xl p-8 border border-gray-200">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-4xl font-bold text-gray-800 mb-3 flex items-center">
                      <Hash className="h-10 w-10 mr-3 text-blue-600" />
                      {invoiceId}
                    </h3>
                    <StatusBadge status={invoiceData.status || 'Unknown'} />
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold text-gray-800 mb-2">
                      ${convertStroopsToUsdc(invoiceData.amount || '0')} 
                    </div>
                    <div className="text-2xl font-semibold text-blue-600">USDC</div>
                    <div className="text-lg text-gray-600 mt-1">Amount Due</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Address Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <h4 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                    <User className="h-6 w-6 mr-3" />
                    From (Creator)
                  </h4>
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-mono text-blue-900 break-all">
                      {invoiceData.creator ? 
                        `${invoiceData.creator.slice(0, 16)}...${invoiceData.creator.slice(-16)}` : 
                        'Unknown'
                      }
                    </code>
                    <button
                      onClick={() => invoiceData.creator && handleCopy(invoiceData.creator, 'creator')}
                      className="ml-3 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copied === 'creator' ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                  <h4 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
                    <User className="h-6 w-6 mr-3" />
                    To (Recipient)
                  </h4>
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-mono text-orange-900 break-all">
                      {invoiceData.recipient ? 
                        `${invoiceData.recipient.slice(0, 16)}...${invoiceData.recipient.slice(-16)}` : 
                        'Unknown'
                      }
                    </code>
                    <button
                      onClick={() => invoiceData.recipient && handleCopy(invoiceData.recipient, 'recipient')}
                      className="ml-3 p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-200 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copied === 'recipient' ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Timeline */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h4 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                  <Calendar className="h-6 w-6 mr-3" />
                  Timeline
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-600 font-medium">Created:</span>
                    <span className="text-gray-800">
                      {invoiceData.created_at ? 
                        new Date(parseInt(invoiceData.created_at)).toLocaleString() : 
                        'Unknown'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-600 font-medium">Last Updated:</span>
                    <span className="text-gray-800">
                      {invoiceData.last_updated ? 
                        new Date(parseInt(invoiceData.last_updated)).toLocaleString() : 
                        'Unknown'
                      }
                    </span>
                  </div>
                  {invoiceData.paid_at && (
                    <div className="flex justify-between items-center text-lg border-t pt-4">
                      <span className="text-green-600 font-semibold">Paid:</span>
                      <span className="text-green-600 font-semibold">
                        {new Date(parseInt(invoiceData.paid_at)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              {/* DEBUG OUTPUT: Remove after fixing! */}
              <pre className="bg-gray-100 p-4 rounded-xl text-xs mb-4 overflow-x-auto">
                {JSON.stringify({
                  walletAddress,
                  creator: invoiceData.creator,
                  recipient: invoiceData.recipient,
                  status: invoiceData.status,
                  isCreator,
                  isRecipient,
                  showSend,
                  showDelete,
                  showAcknowledge,
                  showAcknowledgeAndPay,
                  showPay
                }, null, 2)}
              </pre>
              <div className="bg-gray-50 rounded-2xl p-6">
                <h4 className="text-xl font-semibold text-gray-700 mb-4">Available Actions</h4>
                <div className="flex flex-wrap gap-4">
                  {showSend && (
                    <button
                      onClick={handleSend}
                      disabled={acknowledging}
                      className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:transform-none text-lg"
                    >
                      {acknowledging ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send Invoice
                        </>
                      )}
                    </button>
                  )}

                  {showDelete && (
                    <button
                      onClick={() => alert('Delete functionality not implemented yet')}
                      className="flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 text-lg"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete Draft
                    </button>
                  )}

                  {showAcknowledge && (
                    <button
                      onClick={handleAcknowledge}
                      disabled={acknowledging}
                      className="flex items-center bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:transform-none text-lg"
                    >
                      {acknowledging ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Acknowledging...
                        </>
                      ) : (
                        <>
                          <HandHeart className="w-5 h-5 mr-2" />
                          Acknowledge
                        </>
                      )}
                    </button>
                  )}

                  {showAcknowledgeAndPay && (
                    <button
                      onClick={handleAcknowledgeAndPay}
                      disabled={acknowledging || paying}
                      className="flex items-center bg-gradient-to-r from-yellow-500 to-green-600 hover:from-yellow-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:transform-none text-lg"
                    >
                      {acknowledging || paying ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-5 h-5 mr-2" />
                          Acknowledge & Pay
                        </>
                      )}
                    </button>
                  )}

                  {showPay && (
                    <button
                      onClick={handlePay}
                      disabled={paying || approving}
                      className="flex items-center bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:transform-none text-lg"
                    >
                      {(paying || approving) ? (approving ? 'Approving...' : 'Paying...') : 'Pay Invoice'}
                    </button>
                  )}
                </div>

                {actionError && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-xl">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">{actionError}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Modal Footer */}
        <div className="bg-gray-50 px-8 py-6 flex justify-between items-center border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-lg"
          >
            Close
          </button>
          {invoiceData && (
            <a 
              href={`https://stellar.expert/explorer/testnet/account/${invoiceData.creator}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center font-semibold text-lg transform hover:scale-105"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              View on Stellar Expert
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Invoice Card Component
const InvoiceCard = ({ 
  invoice, 
  onClick, 
  isCreated 
}: { 
  invoice: any; 
  onClick: () => void;
  isCreated: boolean;
}) => {
  return (
    <div 
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 hover:bg-white/90 transform hover:scale-[1.02]"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
            <Hash className="h-7 w-7 text-white" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-800 mb-1">{invoice.invoice_id}</h4>
            <p className="text-base text-gray-600">
              {isCreated ? 'Sent to' : 'Received from'}: {
                (isCreated ? invoice.recipient : invoice.creator).slice(0, 10)
              }...
            </p>
          </div>
        </div>
        <div className="text-right">
         <StatusBadge status={invoice.status} />
         <div className="text-2xl font-bold text-gray-800 mt-3">
           ${convertStroopsToUsdc(invoice.amount || '0')} USDC
         </div>
       </div>
     </div>
     
     {invoice.metadata?.description && (
       <p className="text-base text-gray-600 mb-4 line-clamp-2 bg-gray-50 p-3 rounded-lg">
         {invoice.metadata.description}
       </p>
     )}
     
     <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-100">
       <span className="font-medium">
         Created: {new Date(parseInt(invoice.created_at)).toLocaleDateString()}
       </span>
       <div className="flex items-center text-blue-600">
         <Eye className="h-4 w-4 mr-1" />
         <span className="font-medium">View Details</span>
       </div>
     </div>
   </div>
 );
};

// Main View Invoices Component
export default function ViewInvoicesPage() {
 const wallet = useWallet();
 const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [currentTab, setCurrentTab] = useState<'all' | 'created' | 'received'>('all');
 const [invoicesData, setInvoicesData] = useState<any>(null);
 const [loading, setLoading] = useState(false);
 
 // Hooks for fetching invoice data
 const { mutate: getAllInvoices, loading: loadingAll, error: errorAll } = useGetAllInvoicesForAddress();
 const { mutate: getCreatedInvoices, loading: loadingCreated, error: errorCreated } = useGetInvoicesByCreator();
 const { mutate: getReceivedInvoices, loading: loadingReceived, error: errorReceived } = useGetInvoicesByRecipient();

 // Fetch invoices when wallet connects
 useEffect(() => {
   if (wallet.address && currentTab === 'all') {
     fetchAllInvoices();
   } else if (wallet.address && currentTab === 'created') {
     fetchCreatedInvoices();
   } else if (wallet.address && currentTab === 'received') {
     fetchReceivedInvoices();
   }
 }, [wallet.address, currentTab]);

 const fetchAllInvoices = async () => {
   if (!wallet.address) return;
   setLoading(true);
   try {
     const data = await getAllInvoices(wallet.address, wallet.address);
     console.log('📋 All invoices data:', data);
     setInvoicesData(data);
   } catch (error) {
     console.error('❌ Failed to fetch all invoices:', error);
   } finally {
     setLoading(false);
   }
 };

 const fetchCreatedInvoices = async () => {
   if (!wallet.address) return;
   setLoading(true);
   try {
     const data = await getCreatedInvoices(wallet.address, wallet.address);
     console.log('📤 Created invoices data:', data);
     setInvoicesData({ created: data, received: [] });
   } catch (error) {
     console.error('❌ Failed to fetch created invoices:', error);
   } finally {
     setLoading(false);
   }
 };

 const fetchReceivedInvoices = async () => {
   if (!wallet.address) return;
   setLoading(true);
   try {
     const data = await getReceivedInvoices(wallet.address, wallet.address);
     console.log('📬 Received invoices data:', data);
     setInvoicesData({ created: [], received: data });
   } catch (error) {
     console.error('❌ Failed to fetch received invoices:', error);
   } finally {
     setLoading(false);
   }
 };

 const handleViewInvoice = (invoiceId: string) => {
   setSelectedInvoiceId(invoiceId);
   setIsModalOpen(true);
 };

 const refreshData = () => {
   if (currentTab === 'all') fetchAllInvoices();
   else if (currentTab === 'created') fetchCreatedInvoices();
   else fetchReceivedInvoices();
 };

 const getDisplayInvoices = () => {
   if (!invoicesData) return { created: [], received: [] };
   
   if (currentTab === 'created') {
     return { created: invoicesData.created || invoicesData || [], received: [] };
   } else if (currentTab === 'received') {
     return { created: [], received: invoicesData.received || invoicesData || [] };
   } else {
     return {
       created: invoicesData.created || [],
       received: invoicesData.received || []
     };
   }
 };

 const displayData = getDisplayInvoices();
 const allInvoices = [...displayData.created, ...displayData.received];

 return (
   <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-orange-50">
     {/* Enhanced Navigation */}
     <nav className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="flex justify-between items-center py-6">
           <div className="flex items-center">
             <button className="mr-6 p-3 rounded-xl hover:bg-gray-100 transition-colors">
               <ArrowLeft className="h-6 w-6 text-gray-600" />
             </button>
             <div className="flex items-center">
               <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                 <FileText className="h-8 w-8 text-white" />
               </div>
               <div className="ml-4">
                 <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                   Billr
                 </h1>
                 <p className="text-sm text-gray-600">Blockchain Invoice Management</p>
               </div>
             </div>
           </div>
           <div className="text-base text-gray-500">
             {wallet.address ? (
               <div className="flex items-center space-x-4">
                 <div className="flex items-center bg-green-100 px-4 py-2 rounded-xl">
                   <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                   <span className="text-green-800 font-semibold">Connected</span>
                 </div>
                 <span className="font-mono text-lg">{wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</span>
                 <button
                   onClick={wallet.disconnect}
                   className="text-red-600 hover:text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                 >
                   Disconnect
                 </button>
               </div>
             ) : (
               <button
                 className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg text-lg"
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
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
       {/* Enhanced Page Header */}
       <div className="mb-10 text-center">
         <h2 className="text-4xl font-bold text-gray-800 mb-4">My Invoice Dashboard</h2>
         <p className="text-xl text-gray-600 max-w-2xl mx-auto">
           View, manage, and track your blockchain invoices with complete transparency
         </p>
       </div>

       {/* Enhanced Stats Cards - Moved Above */}
       {!loading && invoicesData && allInvoices.length > 0 && (
         <div className="mb-10 grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 text-center border border-blue-300">
             <div className="text-3xl font-bold text-blue-800 mb-2">{displayData.created.length}</div>
             <div className="text-lg font-semibold text-blue-700">Created</div>
           </div>
           <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 text-center border border-green-300">
             <div className="text-3xl font-bold text-green-800 mb-2">{displayData.received.length}</div>
             <div className="text-lg font-semibold text-green-700">Received</div>
           </div>
           <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl p-6 text-center border border-yellow-300">
             <div className="text-3xl font-bold text-yellow-800 mb-2">
               {allInvoices.filter(inv => inv.status === 'Paid').length}
             </div>
             <div className="text-lg font-semibold text-yellow-700">Paid</div>
           </div>
           <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-6 text-center border border-orange-300">
             <div className="text-3xl font-bold text-orange-800 mb-2">
               {allInvoices.filter(inv => ['Sent', 'Acknowledged'].includes(inv.status)).length}
             </div>
             <div className="text-lg font-semibold text-orange-700">Pending</div>
           </div>
         </div>
       )}

       {/* Wallet Connection Warning */}
       {!wallet.address && (
         <div className="mb-10 p-8 bg-yellow-100 border border-yellow-300 rounded-2xl text-yellow-800 text-center">
           <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
           <h3 className="text-2xl font-semibold mb-2">Wallet Connection Required</h3>
           <p className="text-lg">Please connect your wallet to view and manage invoices.</p>
         </div>
       )}

       {wallet.address && (
         <>
           {/* Enhanced Filter Tabs */}
           <div className="mb-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
             <div className="flex">
               <button
                 onClick={() => setCurrentTab('all')}
                 className={`flex-1 px-8 py-6 text-center font-semibold transition-all flex items-center justify-center text-lg ${
                   currentTab === 'all'
                     ? 'bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-lg'
                     : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                 }`}
               >
                 <Archive className="h-6 w-6 mr-3" />
                 All Invoices ({allInvoices.length})
               </button>
               <button
                 onClick={() => setCurrentTab('created')}
                 className={`flex-1 px-8 py-6 text-center font-semibold transition-all flex items-center justify-center text-lg ${
                   currentTab === 'created'
                     ? 'bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-lg'
                     : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                 }`}
               >
                 <Send className="h-6 w-6 mr-3" />
                 Created ({displayData.created.length})
               </button>
               <button
                 onClick={() => setCurrentTab('received')}
                 className={`flex-1 px-8 py-6 text-center font-semibold transition-all flex items-center justify-center text-lg ${
                   currentTab === 'received'
                     ? 'bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-lg'
                     : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                 }`}
               >
                 <Inbox className="h-6 w-6 mr-3" />
                 Received ({displayData.received.length})
               </button>
             </div>
           </div>

           {/* Loading State */}
           {loading && (
             <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-16 border border-gray-200 text-center">
               <RefreshCw className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-6" />
               <h3 className="text-2xl font-semibold text-gray-700 mb-4">Loading Invoices...</h3>
               <p className="text-lg text-gray-500">Fetching your invoices from the blockchain</p>
             </div>
           )}

           {/* Error State */}
           {(errorAll || errorCreated || errorReceived) && !loading && (
             <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
               <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
               <h3 className="text-2xl font-semibold text-red-800 mb-4">Failed to Load Invoices</h3>
               <p className="text-lg text-red-700 mb-6">
                 {errorAll?.message || errorCreated?.message || errorReceived?.message}
               </p>
               <button
                 onClick={refreshData}
                 className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold text-lg"
               >
                 Try Again
               </button>
             </div>
           )}

           {/* Enhanced Invoices Grid */}
           {!loading && !errorAll && !errorCreated && !errorReceived && (
             <>
               {allInvoices.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-10">
                   {currentTab === 'all' && (
                     <>
                       {displayData.created.map((invoice: any) => (
                         <InvoiceCard
                           key={`created-${invoice.invoice_id}`}
                           invoice={invoice}
                           onClick={() => handleViewInvoice(invoice.invoice_id)}
                           isCreated={true}
                         />
                       ))}
                       {displayData.received.map((invoice: any) => (
                         <InvoiceCard
                           key={`received-${invoice.invoice_id}`}
                           invoice={invoice}
                           onClick={() => handleViewInvoice(invoice.invoice_id)}
                           isCreated={false}
                         />
                       ))}
                     </>
                   )}
                   
                   {currentTab === 'created' && displayData.created.map((invoice: any) => (
                     <InvoiceCard
                       key={invoice.invoice_id}
                       invoice={invoice}
                       onClick={() => handleViewInvoice(invoice.invoice_id)}
                       isCreated={true}
                     />
                   ))}
                   
                   {currentTab === 'received' && displayData.received.map((invoice: any) => (
                     <InvoiceCard
                       key={invoice.invoice_id}
                       invoice={invoice}
                       onClick={() => handleViewInvoice(invoice.invoice_id)}
                       isCreated={false}
                     />
                   ))}
                 </div>
               ) : (
                 <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-16 border border-gray-200 text-center">
                   <FileText className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                   <h3 className="text-2xl font-semibold text-gray-700 mb-4">
                     No {currentTab === 'all' ? '' : currentTab} Invoices Found
                   </h3>
                   <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
                     {currentTab === 'created' 
                       ? 'You haven\'t created any invoices yet. Start by creating your first blockchain invoice.'
                       : currentTab === 'received'
                       ? 'You haven\'t received any invoices yet. Invoices sent to your wallet will appear here.'
                       : 'You don\'t have any invoices yet. Create your first invoice to get started.'
                     }
                   </p>
                   <button
                     onClick={() => window.location.href = '/create'}
                     className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white px-8 py-4 rounded-2xl font-semibold transition-all transform hover:scale-105 shadow-lg text-lg"
                   >
                     Create Your First Invoice
                   </button>
                 </div>
               )}
             </>
           )}

           {/* Enhanced Refresh Button */}
           <div className="text-center">
             <button
               onClick={refreshData}
               disabled={loading}
               className="bg-white/80 hover:bg-white disabled:bg-gray-100 text-gray-700 disabled:text-gray-400 px-8 py-4 rounded-2xl font-semibold border-2 border-gray-200 transition-all hover:border-blue-300 hover:shadow-xl disabled:hover:border-gray-200 disabled:hover:shadow-none flex items-center mx-auto disabled:cursor-not-allowed text-lg backdrop-blur-sm"
             >
               <RefreshCw className={`h-6 w-6 mr-3 ${loading ? 'animate-spin' : ''}`} />
               {loading ? 'Refreshing...' : 'Refresh Invoices'}
             </button>
           </div>
         </>
       )}
     </div>

     {/* Enhanced Invoice Modal */}
     <InvoiceModal 
       invoiceId={selectedInvoiceId}
       isOpen={isModalOpen}
       onClose={() => {
         setIsModalOpen(false);
         setSelectedInvoiceId(null);
       }}
       walletAddress={wallet.address}
       onRefresh={refreshData}
     />
   </div>
 );
}