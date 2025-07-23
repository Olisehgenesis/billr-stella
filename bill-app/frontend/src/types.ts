// Type for invoice metadata key-value pair
export interface InvoiceMetadata {
  key: string;
  value: string;
}

// Type for invoice items
export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: string;
  vatRate: number;
}

// Type for the whole invoice
export interface Invoice {
  invoiceId: string;
  recipientAddress: string;
  amount: string;
  description: string;
  metadata: InvoiceMetadata[];
  includeItems: boolean;
  items: InvoiceItem[];
} 