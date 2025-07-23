//@ts-nocheck

import { useState, useCallback } from 'react';
import { Contract, rpc as SorobanRpc, TransactionBuilder, Networks, Address, StrKey, nativeToScVal, scValToNative, Operation, Asset } from '@stellar/stellar-sdk';
import { Api, Server } from '@stellar/stellar-sdk/rpc';

// USDC has 7 decimal places on Stellar
const USDC_DECIMALS = 7;

// Contract configuration - UPDATED with your deployed contract
const CONTRACT_ADDRESS = 'CCAV5ZYL3LI6MB254CHHVB6B5JBLJ6RUBMYZT5RCBVS46MHS3L4CLIWD';
const RPC_URL = 'https://soroban-testnet.stellar.org';

// Types matching your Rust contract
export interface InvoiceMetadata {
  key: string;
  value: string;
}

export interface ContractError {
  code: number;
  message: string;
  details?: any;
}

export interface AssembledTransaction {
  raw: string; // Clean XDR string
  simulation?: any;
}

// Parsed invoice interface
export interface ParsedInvoice {
  invoice_id: string;
  creator: string;
  recipient: string;
  amount: string;
  metadata: Record<string, string>;
  status: string;
  created_at: string;
  paid_at?: string;
  acknowledgment_note?: string;
  last_updated: string;
}

// Utility functions for USDC conversion
export const convertUsdcToStroops = (usdcAmount: string): string => {
  const amount = parseFloat(usdcAmount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid USDC amount');
  }
  
  // Convert to stroops (smallest unit) - multiply by 10^7 for USDC
  const stroops = Math.floor(amount * Math.pow(10, USDC_DECIMALS));
  return stroops.toString(); // Return as string to avoid BigInt serialization issues
};

export const convertStroopsToUsdc = (stroops: string): string => {
  const amount = parseInt(stroops) / Math.pow(10, USDC_DECIMALS);
  return amount.toFixed(2);
};

// Validation helpers
export const validateStellarAddress = (address: string): boolean => {
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
};

export const validateInvoiceId = (invoiceId: string): boolean => {
  return !!invoiceId && invoiceId.trim().length > 0 && invoiceId.length <= 64;
};

// ENHANCED DATA PARSING FUNCTIONS
const parseInvoiceData = (scVal: any): ParsedInvoice | null => {
  try {
    console.log('🔍 Parsing invoice ScVal:', scVal);
    
    // Handle null, undefined, or empty cases
    if (!scVal || scVal === null || scVal === undefined) {
      console.log('📊 Empty or null invoice ScVal');
      return null;
    }
    
    let nativeData;
    
    // Check if it's already a plain JavaScript object
    if (typeof scVal === 'object' && scVal !== null && !scVal._switch && !scVal.toXDR) {
      console.log('📊 Already native JavaScript object');
      nativeData = scVal;
    } else {
      // Try to convert ScVal to native JavaScript object
      try {
        nativeData = scValToNative(scVal);
        console.log('📊 Native invoice data:', nativeData);
      } catch (parseError) {
        console.log('📊 Invoice ScVal parsing failed:', parseError);
        return null;
      }
    }
    
    // Ensure we have a valid object
    if (!nativeData || typeof nativeData !== 'object') {
      console.log('📊 Invalid native data structure');
      return null;
    }
    
    // Handle the parsed structure
    const invoice: ParsedInvoice = {
      invoice_id: nativeData.invoice_id || '',
      creator: nativeData.creator || '',
      recipient: nativeData.recipient || '',
      amount: nativeData.amount?.toString() || '0',
      metadata: nativeData.metadata || {},
      status: nativeData.status || 'Unknown',
      created_at: nativeData.created_at?.toString() || '0',
      paid_at: nativeData.paid_at?.toString(),
      acknowledgment_note: nativeData.acknowledgment_note,
      last_updated: nativeData.last_updated?.toString() || '0'
    };
    
    console.log('✅ Parsed invoice:', invoice);
    return invoice;
  } catch (error) {
    console.error('❌ Failed to parse invoice:', error);
    return null;
  }
};

const parseInvoiceList = (scVal: any): ParsedInvoice[] => {
  try {
    console.log('🔍 Parsing invoice list ScVal:', scVal);
    
    // Handle null, undefined, or empty cases
    if (!scVal || scVal === null || scVal === undefined) {
      console.log('📊 Empty or null ScVal, returning empty array');
      return [];
    }
    
    // Check if it's already an empty array
    if (Array.isArray(scVal) && scVal.length === 0) {
      console.log('📊 Empty array ScVal, returning empty array');
      return [];
    }
    
    // Check if it's already a JavaScript array with objects
    if (Array.isArray(scVal) && scVal.length > 0 && typeof scVal[0] === 'object' && scVal[0] !== null && !scVal[0]._switch) {
      console.log('📊 Already native JavaScript array, parsing directly');
      return scVal
        .map(parseInvoiceData)
        .filter((invoice): invoice is ParsedInvoice => invoice !== null);
    }
    
    // Try to convert ScVal to native JavaScript
    let nativeData;
    try {
      nativeData = scValToNative(scVal);
      console.log('📊 Native invoice list data:', nativeData);
    } catch (parseError) {
      console.log('📊 ScVal parsing failed, treating as empty:', parseError);
      return [];
    }
    
    if (Array.isArray(nativeData)) {
      return nativeData
        .map(parseInvoiceData)
        .filter((invoice): invoice is ParsedInvoice => invoice !== null);
    }
    
    return [];
  } catch (error) {
    console.error('❌ Failed to parse invoice list:', error);
    return [];
  }
};

const parseInvoiceMap = (scVal: any): { created: ParsedInvoice[]; received: ParsedInvoice[] } => {
  try {
    console.log('🔍 Parsing invoice map ScVal:', scVal);
    
    // Handle null, undefined, or empty cases
    if (!scVal || scVal === null || scVal === undefined) {
      console.log('📊 Empty or null map ScVal, returning empty result');
      return { created: [], received: [] };
    }
    
    // Try to convert ScVal to native JavaScript
    let nativeData;
    try {
      nativeData = scValToNative(scVal);
      console.log('📊 Native invoice map data:', nativeData);
    } catch (parseError) {
      console.log('📊 ScVal map parsing failed, treating as empty:', parseError);
      return { created: [], received: [] };
    }
    
    // Handle Map structure from contract
    if (nativeData && typeof nativeData === 'object') {
      const result = {
        created: [],
        received: []
      };
      
      // If it's a Map, convert to object first
      if (nativeData instanceof Map) {
        const mapObj = Object.fromEntries(nativeData);
        result.created = parseInvoiceList(mapObj.created || []);
        result.received = parseInvoiceList(mapObj.received || []);
      } else {
        // If it's already an object
        result.created = parseInvoiceList(nativeData.created || []);
        result.received = parseInvoiceList(nativeData.received || []);
      }
      
      return result;
    }
    
    return { created: [], received: [] };
  } catch (error) {
    console.error('❌ Failed to parse invoice map:', error);
    return { created: [], received: [] };
  }
};

// Debug function to check if invoice exists after creation
export const debugInvoiceExists = async (invoiceId: string, account: string): Promise<boolean> => {
  try {
    console.log('🔍 DEBUG: Checking if invoice exists:', invoiceId);
    
    const server = new SorobanRpc.Server(RPC_URL);
    const contract = new Contract(CONTRACT_ADDRESS);
    const sourceAccount = await server.getAccount(account);
    
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET,
    })
    .addOperation(
      contract.call('get_invoice', 
        nativeToScVal(invoiceId, { type: 'string' })
      )
    )
    .setTimeout(180)
    .build();
    
    const simulation = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      console.log('❌ DEBUG: Invoice does not exist:', simulation.error);
      return false;
    }
    
    console.log('✅ DEBUG: Invoice exists!', simulation.result?.retval);
    return true;
    
  } catch (error) {
    console.log('❌ DEBUG: Error checking invoice:', error);
    return false;
  }
};
const handleContractError = (err: any, operation: string): ContractError => {
  console.error(`Contract error in ${operation}:`, err);
  
  let contractError: ContractError = {
    code: 0,
    message: `Failed to ${operation}`,
    details: err
  };

  if (err && typeof err === 'object') {
    if (err.message) {
      contractError.message = err.message;
    }
    
    if (err.code !== undefined) {
      contractError.code = err.code;
    }

    // Handle simulation errors
    if (err.simulation && err.simulation.error) {
      contractError.message = `Simulation error: ${err.simulation.error}`;
    }

    // Handle RPC errors
    if (err.response?.data?.message) {
      contractError.message = err.response.data.message;
    }

    // Map Soroban contract errors to user-friendly messages
    if (err.message?.includes('InvoiceAlreadyExists')) {
      contractError.message = 'An invoice with this ID already exists. Please use a different Invoice ID.';
    } else if (err.message?.includes('InvalidAmount')) {
      contractError.message = 'Invalid amount. Amount must be greater than 0.';
    } else if (err.message?.includes('Unauthorized')) {
      contractError.message = 'Authorization failed. Please make sure your wallet is connected properly.';
    } else if (err.message?.includes('InvoiceNotFound')) {
      contractError.message = 'Invoice not found.';
    } else if (err.message?.includes('InvalidStatus')) {
      contractError.message = 'Invalid invoice status for this operation.';
    }
  }

  return contractError;
};

// Main hook for creating invoices
export const useCreateInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (params: {
    creator: string;
    invoiceId: string;  // Will be converted to invoice_id for contract
    recipient: string;
    amount: string;     // Will be converted to u64
    metadata: Record<string, string>;
  }): Promise<AssembledTransaction> => {
    console.log('🚀 Creating invoice with params:', params);
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate inputs
      if (!validateStellarAddress(params.creator)) {
        throw new Error('Invalid creator address');
      }
      if (!validateStellarAddress(params.recipient)) {
        throw new Error('Invalid recipient address');
      }
      if (!validateInvoiceId(params.invoiceId)) {
        throw new Error('Invalid invoice ID');
      }

      // Convert amount to stroops (u64)
      const amountStroops = convertUsdcToStroops(params.amount);
      console.log('💰 Amount conversion:', {
        original: params.amount,
        stroops: amountStroops
      });

      // Initialize RPC and contract
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);

      // Get source account
      const sourceAccount = await server.getAccount(params.creator);
      console.log('👤 Source account loaded:', params.creator);

      // Build transaction with CORRECT parameter names matching Rust contract
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '1000000', // Higher fee for Soroban operations
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'create_invoice',
          // Use nativeToScVal for proper conversion
          nativeToScVal(params.creator, { type: 'address' }),      // creator: Address
          nativeToScVal(params.invoiceId, { type: 'string' }),     // invoice_id: String
          nativeToScVal(params.recipient, { type: 'address' }),    // recipient: Address  
          nativeToScVal(parseInt(amountStroops), { type: 'u64' }), // amount: u64
          nativeToScVal(params.metadata, { type: 'map' })          // metadata: Map<String, String>
        )
      )
      .setTimeout(180)
      .build();

      console.log('📋 Transaction built, simulating...');

      // Simulate transaction
      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        console.error('❌ Simulation failed:', simulation);
        throw new Error(`Contract simulation failed: ${simulation.error}`);
      }

      if (SorobanRpc.Api.isSimulationRestore(simulation)) {
        console.log('🔄 Contract needs state restoration');
        throw new Error('Contract state restoration required');
      }

      console.log('✅ Simulation successful');

      // Prepare transaction for signing - this is the key fix
      const preparedTransaction = SorobanRpc.assembleTransaction(
        transaction, 
        simulation
      ).build(); // Call .build() to get the actual Transaction object

      // Return clean XDR string to avoid serialization issues
      const result: AssembledTransaction = {
        raw: preparedTransaction.toXDR(), // Now this will work correctly
        simulation: simulation
      };

      console.log('🎯 Transaction prepared successfully, XDR length:', result.raw.length);
      
      return result;

    } catch (err: any) {
      const contractError = handleContractError(err, 'create invoice');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for sending invoices (changing status from Draft to Sent)
export const useSendInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (params: {
    creator: string;
    invoiceId: string;
  }): Promise<AssembledTransaction> => {
    console.log('📤 Sending invoice with params:', params);
    
    setLoading(true);
    setError(null);
    
    try {
      if (!validateStellarAddress(params.creator)) {
        throw new Error('Invalid creator address');
      }
      if (!validateInvoiceId(params.invoiceId)) {
        throw new Error('Invalid invoice ID');
      }

      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      const sourceAccount = await server.getAccount(params.creator);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '1000000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'send_invoice',
          nativeToScVal(params.creator, { type: 'address' }),
          nativeToScVal(params.invoiceId, { type: 'string' })
        )
      )
      .setTimeout(180)
      .build();

      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulation).build();

      return {
        raw: preparedTransaction.toXDR(),
        simulation: simulation
      };

    } catch (err: any) {
      const contractError = handleContractError(err, 'send invoice');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for acknowledging invoices
export const useAcknowledgeInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (params: {
    recipient: string;
    invoiceId: string;
    note?: string;
  }): Promise<AssembledTransaction> => {
    console.log('✅ Acknowledging invoice with params:', params);
    
    setLoading(true);
    setError(null);
    
    try {
      if (!validateStellarAddress(params.recipient)) {
        throw new Error('Invalid recipient address');
      }

      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      const sourceAccount = await server.getAccount(params.recipient);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '1000000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'acknowledge_invoice',
          nativeToScVal(params.recipient, { type: 'address' }),
          nativeToScVal(params.invoiceId, { type: 'string' }),
          params.note 
            ? nativeToScVal(params.note, { type: 'string' })
            : nativeToScVal(null, { type: 'option' })
        )
      )
      .setTimeout(180)
      .build();

      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulation).build();

      return {
        raw: preparedTransaction.toXDR(),
        simulation: simulation
      };

    } catch (err: any) {
      const contractError = handleContractError(err, 'acknowledge invoice');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for paying invoices
export const usePayInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (params: {
    recipient: string;
    invoiceId: string;
  }): Promise<AssembledTransaction> => {
    console.log('💳 Paying invoice with params:', params);
    
    setLoading(true);
    setError(null);
    
    try {
      if (!validateStellarAddress(params.recipient)) {
        throw new Error('Invalid recipient address');
      }

      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      const sourceAccount = await server.getAccount(params.recipient);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '1000000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'pay_invoice',
          nativeToScVal(params.recipient, { type: 'address' }),
          nativeToScVal(params.invoiceId, { type: 'string' })
        )
      )
      .setTimeout(180)
      .build();

      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulation).build();

      return {
        raw: preparedTransaction.toXDR(),
        simulation: simulation
      };

    } catch (err: any) {
      const contractError = handleContractError(err, 'pay invoice');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for getting an invoice
export const useGetInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (invoiceId: string, account?: string): Promise<ParsedInvoice | null> => {
    console.log('🔍 Getting invoice:', invoiceId);
    setLoading(true);
    setError(null);
    try {
      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      // Use the provided account or fallback to the dummy account
      const accountToUse = account || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
      const sourceAccount = await server.getAccount(accountToUse);
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call('get_invoice', 
            nativeToScVal(invoiceId, { type: 'string' })
          )
        )
        .setTimeout(180)
        .build();
      const simulation = await server.simulateTransaction(transaction);
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Failed to get invoice: ${simulation.error}`);
      }
      // Extract and parse result from simulation
      const result = simulation.result?.retval;
      return parseInvoiceData(result);
    } catch (err: any) {
      const contractError = handleContractError(err, 'get invoice');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for getting all invoices by creator
export const useGetInvoicesByCreator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (creator: string, account?: string): Promise<ParsedInvoice[]> => {
    console.log('📋 Getting invoices by creator:', creator);
    
    setLoading(true);
    setError(null);
    
    try {
      if (!validateStellarAddress(creator)) {
        throw new Error('Invalid creator address');
      }

      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      
      const accountToUse = account || creator;
      const sourceAccount = await server.getAccount(accountToUse);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'get_invoices_by_creator',
          nativeToScVal(creator, { type: 'address' })
        )
      )
      .setTimeout(180)
      .build();

      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Failed to get invoices: ${simulation.error}`);
      }

      const result = simulation.result?.retval;
      return parseInvoiceList(result);

    } catch (err: any) {
      const contractError = handleContractError(err, 'get invoices by creator');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for getting all invoices by recipient
export const useGetInvoicesByRecipient = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (recipient: string, account?: string): Promise<ParsedInvoice[]> => {
    console.log('📬 Getting invoices by recipient:', recipient);
    
    setLoading(true);
    setError(null);
    
    try {
      if (!validateStellarAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }

      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      
      const accountToUse = account || recipient;
      const sourceAccount = await server.getAccount(accountToUse);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'get_invoices_by_recipient',
          nativeToScVal(recipient, { type: 'address' })
        )
      )
      .setTimeout(180)
      .build();

      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Failed to get invoices: ${simulation.error}`);
      }

      const result = simulation.result?.retval;
      return parseInvoiceList(result);

    } catch (err: any) {
      const contractError = handleContractError(err, 'get invoices by recipient');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for getting all invoices for an address (both created and received)
export const useGetAllInvoicesForAddress = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (address: string, account?: string): Promise<{ created: ParsedInvoice[]; received: ParsedInvoice[] }> => {
    console.log('📑 Getting all invoices for address:', address);
    
    setLoading(true);
    setError(null);
    
    try {
      if (!validateStellarAddress(address)) {
        throw new Error('Invalid address');
      }

      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      
      const accountToUse = account || address;
      const sourceAccount = await server.getAccount(accountToUse);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'get_all_invoices_for_address',
          nativeToScVal(address, { type: 'address' })
        )
      )
      .setTimeout(180)
      .build();

      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Failed to get all invoices: ${simulation.error}`);
      }

      const result = simulation.result?.retval;
      return parseInvoiceMap(result);

    } catch (err: any) {
      const contractError = handleContractError(err, 'get all invoices for address');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Hook for getting pending invoices (invoices needing action)
export const useGetPendingInvoices = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (address: string, account?: string): Promise<{ awaiting_payment: ParsedInvoice[]; pending_action: ParsedInvoice[] }> => {
    console.log('⏳ Getting pending invoices for address:', address);
    
    setLoading(true);
    setError(null);
    
    try {
      if (!validateStellarAddress(address)) {
        throw new Error('Invalid address');
      }

      const server = new SorobanRpc.Server(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS);
      
      const accountToUse = account || address;
      const sourceAccount = await server.getAccount(accountToUse);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'get_pending_invoices',
          nativeToScVal(address, { type: 'address' })
        )
      )
      .setTimeout(180)
      .build();

      const simulation = await server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Failed to get pending invoices: ${simulation.error}`);
      }

      const result = simulation.result?.retval;
      
      // Parse the pending invoices map
      const nativeData = scValToNative(result);
      console.log('📊 Native pending data:', nativeData);
      
      const parsedResult = {
        awaiting_payment: [],
        pending_action: []
      };
      
      if (nativeData && typeof nativeData === 'object') {
        if (nativeData instanceof Map) {
          const mapObj = Object.fromEntries(nativeData);
          parsedResult.awaiting_payment = parseInvoiceList(mapObj.awaiting_payment || []);
          parsedResult.pending_action = parseInvoiceList(mapObj.pending_action || []);
        } else {
          parsedResult.awaiting_payment = parseInvoiceList(nativeData.awaiting_payment || []);
          parsedResult.pending_action = parseInvoiceList(nativeData.pending_action || []);
        }
      }
      
      return parsedResult;

    } catch (err: any) {
      const contractError = handleContractError(err, 'get pending invoices');
      setError(contractError);
      throw contractError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// USDC Soroban token contract address
const USDC_TOKEN_CONTRACT = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

// Get USDC balance for an address using Soroban token contract
export const getUsdcBalance = async (address: string): Promise<string> => {
    const server = new Server(RPC_URL);
    const contract = new Contract(USDC_TOKEN_CONTRACT);
  
    console.log(`Getting USDC balance for address: ${address}`);
    console.log(`Using contract: ${USDC_TOKEN_CONTRACT}`);
  
    try {
      const sourceAccount = await server.getAccount(address);
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call('balance', nativeToScVal(address, { type: 'address' }))
        )
        .setTimeout(180)
        .build();
  
      const simulation = await server.simulateTransaction(transaction);
      if (Api.isSimulationError(simulation)) {
        console.error(`Simulation failed: ${simulation.error}`);
        throw new Error(`Failed to simulate USDC balance: ${simulation.error}`);
      }
  
      const result = simulation.result?.retval;
      if (!result) {
        console.warn('No return value from balance simulation');
        return '0';
      }
  
      const native = scValToNative(result);
      console.log(`USDC Balance (raw):`, native);
      return native.toString();
    } catch (err: any) {
      console.error(`Error in getUsdcBalance:`, err.message);
      throw err;
    }
  };

// Check if recipient can pay invoice (has enough USDC)
export const useCheckPaymentCapability = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (params: { recipient: string; invoiceAmount: string }) => {
    setLoading(true);
    setError(null);
    try {
      const balance = await getUsdcBalance(params.recipient);
      const required = convertUsdcToStroops(params.invoiceAmount);
      const canPay = BigInt(balance) >= BigInt(required);
      return { canPay, balance, required };
    } catch (err: any) {
      setError({ code: 0, message: err.message || 'Failed to check payment capability', details: err });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Pay invoice: transfer USDC and mark invoice as paid
export const usePayInvoiceWithUsdcTransfer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (params: { recipient: string; invoiceId: string; invoice?: ParsedInvoice }) => {
    setLoading(true);
    setError(null);
    try {
      // Get invoice data if not provided
      let invoice = params.invoice;
      if (!invoice) {
        // Use the get invoice hook logic
        const server = new SorobanRpc.Server(RPC_URL);
        const contract = new Contract(CONTRACT_ADDRESS);
        const sourceAccount = await server.getAccount(params.recipient);
        const transaction = new TransactionBuilder(sourceAccount, {
          fee: '100000',
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(
            contract.call('get_invoice', nativeToScVal(params.invoiceId, { type: 'string' }))
          )
          .setTimeout(180)
          .build();
        const simulation = await server.simulateTransaction(transaction);
        if (SorobanRpc.Api.isSimulationError(simulation)) {
          throw new Error(`Failed to get invoice: ${simulation.error}`);
        }
        const result = simulation.result?.retval;
        const parsed = parseInvoiceData(result);
        if (!parsed) throw new Error('Invoice not found');
        invoice = parsed;
      }
      // Check balance
      const balance = await getUsdcBalance(params.recipient);
      const required = invoice.amount;
      if (BigInt(balance) < BigInt(required)) {
        throw new Error(`Insufficient USDC. Need ${convertStroopsToUsdc(required)}, have ${convertStroopsToUsdc(balance)}`);
      }
      // Build transaction: transfer USDC from recipient to creator
      const server = new SorobanRpc.Server(RPC_URL);
      const usdcContract = new Contract(USDC_TOKEN_CONTRACT);
      const invoiceContract = new Contract(CONTRACT_ADDRESS);
      const sourceAccount = await server.getAccount(params.recipient);
      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: '1000000',
        networkPassphrase: Networks.TESTNET,
      });
      // Transfer USDC from recipient to creator
      txBuilder.addOperation(
        usdcContract.call(
          'transfer',
          nativeToScVal(params.recipient, { type: 'address' }),
          nativeToScVal(invoice.creator, { type: 'address' }),
          nativeToScVal(BigInt(invoice.amount), { type: 'i128' })
        )
      );
      // Mark invoice as paid
      txBuilder.addOperation(
        invoiceContract.call(
          'pay_invoice',
          nativeToScVal(params.recipient, { type: 'address' }),
          nativeToScVal(params.invoiceId, { type: 'string' })
        )
      );
      const transaction = txBuilder.setTimeout(180).build();
      const simulation = await server.simulateTransaction(transaction);
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }
      const preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulation).build();
      return { raw: preparedTransaction.toXDR(), simulation };
    } catch (err: any) {
      setError({ code: 0, message: err.message || 'Failed to pay invoice', details: err });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};

// Approve Billr contract to spend USDC on behalf of the user
export const useApproveUsdcSpending = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  const mutate = useCallback(async (params: { owner: string; amount: string }) => {
    setLoading(true);
    setError(null);
    try {
      if (!validateStellarAddress(params.owner)) {
        throw new Error('Invalid owner address');
      }
      const amountStroops = params.amount;
      const server = new SorobanRpc.Server(RPC_URL);
      const usdcContract = new Contract(USDC_TOKEN_CONTRACT);
      const sourceAccount = await server.getAccount(params.owner);
      // Fetch the current ledger and set expiration_ledger
      const ledgerInfo = await server.getLatestLedger();
      const expirationLedger = ledgerInfo.sequence + 100; // valid for next 100 ledgers
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          usdcContract.call(
            'approve',
            nativeToScVal(params.owner, { type: 'address' }),
            nativeToScVal(CONTRACT_ADDRESS, { type: 'address' }),
            nativeToScVal(BigInt(amountStroops), { type: 'i128' }),
            nativeToScVal(expirationLedger, { type: 'u32' })
          )
        )
        .setTimeout(180)
        .build();
      const simulation = await server.simulateTransaction(transaction);
      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }
      const preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulation).build();
      return {
        raw: preparedTransaction.toXDR(),
        simulation: simulation
      };
    } catch (err: any) {
      setError({ code: 0, message: err.message || 'Failed to approve USDC spending', details: err });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};