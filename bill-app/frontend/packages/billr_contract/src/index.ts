import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCAV5ZYL3LI6MB254CHHVB6B5JBLJ6RUBMYZT5RCBVS46MHS3L4CLIWD",
  }
} as const

export type InvoiceStatus = {tag: "Draft", values: void} | {tag: "Sent", values: void} | {tag: "Acknowledged", values: void} | {tag: "Paid", values: void} | {tag: "Cancelled", values: void};


export interface Invoice {
  acknowledgment_note: Option<string>;
  amount: u64;
  created_at: u64;
  creator: string;
  invoice_id: string;
  last_updated: u64;
  metadata: Map<string, string>;
  paid_at: Option<u64>;
  recipient: string;
  status: InvoiceStatus;
}


export interface InvoiceCreatedEvent {
  amount: u64;
  creator: string;
  invoice_id: string;
  recipient: string;
}


export interface InvoiceSentEvent {
  creator: string;
  invoice_id: string;
  recipient: string;
}


export interface InvoicePaidEvent {
  amount: u64;
  creator: string;
  invoice_id: string;
  paid_at: u64;
  recipient: string;
}


export interface InvoiceAcknowledgedEvent {
  invoice_id: string;
  note: Option<string>;
  recipient: string;
}


export interface InvoiceCancelledEvent {
  creator: string;
  invoice_id: string;
}


export interface InvoiceUpdatedEvent {
  creator: string;
  invoice_id: string;
  updated_at: u64;
}

export type DataKey = {tag: "Invoice", values: readonly [string]} | {tag: "CreatorInvoices", values: readonly [string]} | {tag: "RecipientInvoices", values: readonly [string]} | {tag: "UsdcToken", values: void} | {tag: "Admin", values: void};

export const BillrError = {
  1: {message:"InvoiceNotFound"},
  2: {message:"InvoiceAlreadyExists"},
  3: {message:"Unauthorized"},
  4: {message:"InvalidStatus"},
  5: {message:"InvoiceAlreadyPaid"},
  6: {message:"PaymentFailed"},
  7: {message:"InvalidAmount"},
  8: {message:"InvalidToken"}
}

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract with USDC token address
   */
  initialize: ({admin, usdc_token}: {admin: string, usdc_token: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_invoice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new invoice in draft status
   */
  create_invoice: ({creator, invoice_id, recipient, amount, metadata}: {creator: string, invoice_id: string, recipient: string, amount: u64, metadata: Map<string, string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a send_invoice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Send invoice
   */
  send_invoice: ({creator, invoice_id}: {creator: string, invoice_id: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a acknowledge_invoice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Acknowledge invoice
   */
  acknowledge_invoice: ({recipient, invoice_id, note}: {recipient: string, invoice_id: string, note: Option<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a pay_invoice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pay invoice with USDC
   */
  pay_invoice: ({recipient, invoice_id}: {recipient: string, invoice_id: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancel_invoice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cancel invoice
   */
  cancel_invoice: ({creator, invoice_id}: {creator: string, invoice_id: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a update_metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update metadata
   */
  update_metadata: ({creator, invoice_id, metadata}: {creator: string, invoice_id: string, metadata: Map<string, string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a edit_invoice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Edit invoice
   */
  edit_invoice: ({creator, invoice_id, recipient, amount, metadata}: {creator: string, invoice_id: string, recipient: Option<string>, amount: Option<u64>, metadata: Option<Map<string, string>>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_invoice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get invoice by ID
   */
  get_invoice: ({invoice_id}: {invoice_id: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<Invoice>>>

  /**
   * Construct and simulate a list_by_creator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * List invoices by creator (IDs only)
   */
  list_by_creator: ({creator}: {creator: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a list_by_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * List invoices by recipient (IDs only)
   */
  list_by_recipient: ({recipient}: {recipient: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a get_invoices_by_creator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get invoices by creator (full details) - FIXED NAME LENGTH
   */
  get_invoices_by_creator: ({creator}: {creator: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<Invoice>>>

  /**
   * Construct and simulate a get_invoices_by_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get invoices by recipient (full details)
   */
  get_invoices_by_recipient: ({recipient}: {recipient: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<Invoice>>>

  /**
   * Construct and simulate a get_all_invoices_for_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get all invoices for address
   */
  get_all_invoices_for_address: ({address}: {address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, Array<Invoice>>>>

  /**
   * Construct and simulate a get_pending_invoices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get pending invoices
   */
  get_pending_invoices: ({address}: {address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, Array<Invoice>>>>

  /**
   * Construct and simulate a get_usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get USDC token address
   */
  get_usdc_token: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a update_usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update USDC token address (admin only)
   */
  update_usdc_token: ({admin, new_usdc_token}: {admin: string, new_usdc_token: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAADUludm9pY2VTdGF0dXMAAAAAAAAFAAAAAAAAAAAAAAAFRHJhZnQAAAAAAAAAAAAAAAAAAARTZW50AAAAAAAAAAAAAAAMQWNrbm93bGVkZ2VkAAAAAAAAAAAAAAAEUGFpZAAAAAAAAAAAAAAACUNhbmNlbGxlZAAAAA==",
        "AAAAAQAAAAAAAAAAAAAAB0ludm9pY2UAAAAACgAAAAAAAAATYWNrbm93bGVkZ21lbnRfbm90ZQAAAAPoAAAAEAAAAAAAAAAGYW1vdW50AAAAAAAGAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAACmludm9pY2VfaWQAAAAAABAAAAAAAAAADGxhc3RfdXBkYXRlZAAAAAYAAAAAAAAACG1ldGFkYXRhAAAD7AAAABAAAAAQAAAAAAAAAAdwYWlkX2F0AAAAA+gAAAAGAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAANSW52b2ljZVN0YXR1cwAAAA==",
        "AAAAAQAAAAAAAAAAAAAAE0ludm9pY2VDcmVhdGVkRXZlbnQAAAAABAAAAAAAAAAGYW1vdW50AAAAAAAGAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAACmludm9pY2VfaWQAAAAAABAAAAAAAAAACXJlY2lwaWVudAAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAAEEludm9pY2VTZW50RXZlbnQAAAADAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAACmludm9pY2VfaWQAAAAAABAAAAAAAAAACXJlY2lwaWVudAAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAAEEludm9pY2VQYWlkRXZlbnQAAAAFAAAAAAAAAAZhbW91bnQAAAAAAAYAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAAAAAAKaW52b2ljZV9pZAAAAAAAEAAAAAAAAAAHcGFpZF9hdAAAAAAGAAAAAAAAAAlyZWNpcGllbnQAAAAAAAAT",
        "AAAAAQAAAAAAAAAAAAAAGEludm9pY2VBY2tub3dsZWRnZWRFdmVudAAAAAMAAAAAAAAACmludm9pY2VfaWQAAAAAABAAAAAAAAAABG5vdGUAAAPoAAAAEAAAAAAAAAAJcmVjaXBpZW50AAAAAAAAEw==",
        "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",
        "AAAAAAAAABFHZXQgaW52b2ljZSBieSBJRAAAAAAAAAtnZXRfaW52b2ljZQAAAAABAAAAAAAAAAppbnZvaWNlX2lkAAAAAAAQAAAAAQAAA+gAAAfQAAAAB0ludm9pY2UA",
        "AAAAAAAAACNMaXN0IGludm9pY2VzIGJ5IGNyZWF0b3IgKElEcyBvbmx5KQAAAAAPbGlzdF9ieV9jcmVhdG9yAAAAAAEAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAEAAAPqAAAAEA==",
        "AAAAAAAAACVMaXN0IGludm9pY2VzIGJ5IHJlY2lwaWVudCAoSURzIG9ubHkpAAAAAAAAEWxpc3RfYnlfcmVjaXBpZW50AAAAAAAAAQAAAAAAAAAJcmVjaXBpZW50AAAAAAAAEwAAAAEAAAPqAAAAEA==",
        "AAAAAAAAADpHZXQgaW52b2ljZXMgYnkgY3JlYXRvciAoZnVsbCBkZXRhaWxzKSAtIEZJWEVEIE5BTUUgTEVOR1RIAAAAAAAXZ2V0X2ludm9pY2VzX2J5X2NyZWF0b3IAAAAAAQAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAQAAA+oAAAfQAAAAB0ludm9pY2UA",
        "AAAAAAAAAChHZXQgaW52b2ljZXMgYnkgcmVjaXBpZW50IChmdWxsIGRldGFpbHMpAAAAGWdldF9pbnZvaWNlc19ieV9yZWNpcGllbnQAAAAAAAABAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAQAAA+oAAAfQAAAAB0ludm9pY2UA",
        "AAAAAAAAABxHZXQgYWxsIGludm9pY2VzIGZvciBhZGRyZXNzAAAAHGdldF9hbGxfaW52b2ljZXNfZm9yX2FkZHJlc3MAAAABAAAAAAAAAAdhZGRyZXNzAAAAABMAAAABAAAD7AAAABAAAAPqAAAH0AAAAAdJbnZvaWNlAA==",
        "AAAAAAAAABRHZXQgcGVuZGluZyBpbnZvaWNlcwAAABRnZXRfcGVuZGluZ19pbnZvaWNlcwAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAEAAAPsAAAAEAAAA+oAAAfQAAAAB0ludm9pY2UA",
        "AAAAAAAAABZHZXQgVVNEQyB0b2tlbiBhZGRyZXNzAAAAAAAOZ2V0X3VzZGNfdG9rZW4AAAAAAAAAAAABAAAD6AAAABM=",
        "AAAAAAAAACZVcGRhdGUgVVNEQyB0b2tlbiBhZGRyZXNzIChhZG1pbiBvbmx5KQAAAAAAEXVwZGF0ZV91c2RjX3Rva2VuAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA5uZXdfdXNkY190b2tlbgAAAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACkJpbGxyRXJyb3IAAA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
        create_invoice: this.txFromJSON<Result<void>>,
        send_invoice: this.txFromJSON<Result<void>>,
        acknowledge_invoice: this.txFromJSON<Result<void>>,
        pay_invoice: this.txFromJSON<Result<void>>,
        cancel_invoice: this.txFromJSON<Result<void>>,
        update_metadata: this.txFromJSON<Result<void>>,
        edit_invoice: this.txFromJSON<Result<void>>,
        get_invoice: this.txFromJSON<Option<Invoice>>,
        list_by_creator: this.txFromJSON<Array<string>>,
        list_by_recipient: this.txFromJSON<Array<string>>,
        get_invoices_by_creator: this.txFromJSON<Array<Invoice>>,
        get_invoices_by_recipient: this.txFromJSON<Array<Invoice>>,
        get_all_invoices_for_address: this.txFromJSON<Map<string, Array<Invoice>>>,
        get_pending_invoices: this.txFromJSON<Map<string, Array<Invoice>>>,
        get_usdc_token: this.txFromJSON<Option<string>>,
        update_usdc_token: this.txFromJSON<Result<void>>
  }
}