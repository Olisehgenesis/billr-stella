#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, token, Address, Env, Map, String, Vec,
};

// Invoice status enumeration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InvoiceStatus {
    Draft,
    Sent,
    Acknowledged,
    Paid,
    Cancelled,
}

// Main invoice structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub invoice_id: String,
    pub creator: Address,
    pub recipient: Address,
    pub amount: u64,
    pub metadata: Map<String, String>,
    pub status: InvoiceStatus,
    pub created_at: u64,
    pub paid_at: Option<u64>,
    pub acknowledgment_note: Option<String>,
    pub last_updated: u64,
}

// Contract events
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceCreatedEvent {
    pub invoice_id: String,
    pub creator: Address,
    pub recipient: Address,
    pub amount: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceSentEvent {
    pub invoice_id: String,
    pub creator: Address,
    pub recipient: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoicePaidEvent {
    pub invoice_id: String,
    pub creator: Address,
    pub recipient: Address,
    pub amount: u64,
    pub paid_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceAcknowledgedEvent {
    pub invoice_id: String,
    pub recipient: Address,
    pub note: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceCancelledEvent {
    pub invoice_id: String,
    pub creator: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceUpdatedEvent {
    pub invoice_id: String,
    pub creator: Address,
    pub updated_at: u64,
}

// Storage keys for efficient data organization
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Invoice(String),
    CreatorInvoices(Address),
    RecipientInvoices(Address),
    UsdcToken,
    Admin,
}

// Error types
#[contracterror]
#[derive(Clone, Debug, Copy, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BillrError {
    InvoiceNotFound = 1,
    InvoiceAlreadyExists = 2,
    Unauthorized = 3,
    InvalidStatus = 4,
    InvoiceAlreadyPaid = 5,
    PaymentFailed = 6,
    InvalidAmount = 7,
    InvalidToken = 8,
}

#[contract]
pub struct BillrContract;

#[contractimpl]
impl BillrContract {
    /// Initialize the contract with USDC token address
    pub fn initialize(env: Env, admin: Address, usdc_token: Address) {
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
    }

    /// Create a new invoice in draft status
    pub fn create_invoice(
        env: Env,
        creator: Address,
        invoice_id: String,
        recipient: Address,
        amount: u64,
        metadata: Map<String, String>,
    ) -> Result<(), BillrError> {
        creator.require_auth();

        if amount == 0 {
            return Err(BillrError::InvalidAmount);
        }

        if env.storage().persistent().has(&DataKey::Invoice(invoice_id.clone())) {
            return Err(BillrError::InvoiceAlreadyExists);
        }

        let current_time = env.ledger().timestamp();

        let invoice = Invoice {
            invoice_id: invoice_id.clone(),
            creator: creator.clone(),
            recipient: recipient.clone(),
            amount,
            metadata,
            status: InvoiceStatus::Draft,
            created_at: current_time,
            paid_at: None,
            acknowledgment_note: None,
            last_updated: current_time,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id.clone()), &invoice);

        let mut creator_invoices: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::CreatorInvoices(creator.clone()))
            .unwrap_or(Vec::new(&env));
        creator_invoices.push_back(invoice_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::CreatorInvoices(creator.clone()), &creator_invoices);

        let mut recipient_invoices: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::RecipientInvoices(recipient.clone()))
            .unwrap_or(Vec::new(&env));
        recipient_invoices.push_back(invoice_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::RecipientInvoices(recipient.clone()), &recipient_invoices);

        env.events().publish(
            ("invoice_created",),
            InvoiceCreatedEvent {
                invoice_id,
                creator,
                recipient,
                amount,
            },
        );

        Ok(())
    }

    /// Send invoice
    pub fn send_invoice(env: Env, creator: Address, invoice_id: String) -> Result<(), BillrError> {
        creator.require_auth();

        let mut invoice = Self::get_invoice_internal(&env, &invoice_id)?;

        if invoice.creator != creator {
            return Err(BillrError::Unauthorized);
        }

        if invoice.status != InvoiceStatus::Draft {
            return Err(BillrError::InvalidStatus);
        }

        invoice.status = InvoiceStatus::Sent;
        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id.clone()), &invoice);

        env.events().publish(
            ("invoice_sent",),
            InvoiceSentEvent {
                invoice_id,
                creator,
                recipient: invoice.recipient,
            },
        );

        Ok(())
    }

    /// Acknowledge invoice
    pub fn acknowledge_invoice(
        env: Env, 
        recipient: Address, 
        invoice_id: String,
        note: Option<String>
    ) -> Result<(), BillrError> {
        recipient.require_auth();

        let mut invoice = Self::get_invoice_internal(&env, &invoice_id)?;

        if invoice.recipient != recipient {
            return Err(BillrError::Unauthorized);
        }

        if invoice.status != InvoiceStatus::Sent {
            return Err(BillrError::InvalidStatus);
        }

        let current_time = env.ledger().timestamp();
        invoice.status = InvoiceStatus::Acknowledged;
        invoice.acknowledgment_note = note.clone();
        invoice.last_updated = current_time;
        
        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id.clone()), &invoice);

        env.events().publish(
            ("invoice_acknowledged",),
            InvoiceAcknowledgedEvent {
                invoice_id,
                recipient,
                note,
            },
        );

        Ok(())
    }

    /// Pay invoice with USDC
    pub fn pay_invoice(env: Env, recipient: Address, invoice_id: String) -> Result<(), BillrError> {
        recipient.require_auth();

        let mut invoice = Self::get_invoice_internal(&env, &invoice_id)?;

        if invoice.recipient != recipient {
            return Err(BillrError::Unauthorized);
        }

        match invoice.status {
            InvoiceStatus::Sent | InvoiceStatus::Acknowledged => {},
            InvoiceStatus::Paid => return Err(BillrError::InvoiceAlreadyPaid),
            _ => return Err(BillrError::InvalidStatus),
        }

        let usdc_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::UsdcToken)
            .ok_or(BillrError::InvalidToken)?;

        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(&recipient, &invoice.creator, &(invoice.amount as i128));

        let current_time = env.ledger().timestamp();
        invoice.status = InvoiceStatus::Paid;
        invoice.paid_at = Some(current_time);

        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id.clone()), &invoice);

        env.events().publish(
            ("invoice_paid",),
            InvoicePaidEvent {
                invoice_id,
                creator: invoice.creator,
                recipient,
                amount: invoice.amount,
                paid_at: current_time,
            },
        );

        Ok(())
    }

    /// Cancel invoice
    pub fn cancel_invoice(env: Env, creator: Address, invoice_id: String) -> Result<(), BillrError> {
        creator.require_auth();

        let mut invoice = Self::get_invoice_internal(&env, &invoice_id)?;

        if invoice.creator != creator {
            return Err(BillrError::Unauthorized);
        }

        if invoice.status == InvoiceStatus::Paid {
            return Err(BillrError::InvalidStatus);
        }

        invoice.status = InvoiceStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id.clone()), &invoice);

        env.events().publish(
            ("invoice_cancelled",),
            InvoiceCancelledEvent {
                invoice_id,
                creator,
            },
        );

        Ok(())
    }

    /// Update metadata
    pub fn update_metadata(
        env: Env,
        creator: Address,
        invoice_id: String,
        metadata: Map<String, String>,
    ) -> Result<(), BillrError> {
        creator.require_auth();

        let mut invoice = Self::get_invoice_internal(&env, &invoice_id)?;

        if invoice.creator != creator {
            return Err(BillrError::Unauthorized);
        }

        match invoice.status {
            InvoiceStatus::Paid | InvoiceStatus::Cancelled => return Err(BillrError::InvalidStatus),
            _ => {},
        }

        let current_time = env.ledger().timestamp();
        invoice.metadata = metadata;
        invoice.last_updated = current_time;
        
        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id.clone()), &invoice);

        env.events().publish(
            ("invoice_updated",),
            InvoiceUpdatedEvent {
                invoice_id,
                creator,
                updated_at: current_time,
            },
        );

        Ok(())
    }

    /// Edit invoice
    pub fn edit_invoice(
        env: Env,
        creator: Address,
        invoice_id: String,
        recipient: Option<Address>,
        amount: Option<u64>,
        metadata: Option<Map<String, String>>,
    ) -> Result<(), BillrError> {
        creator.require_auth();

        let mut invoice = Self::get_invoice_internal(&env, &invoice_id)?;

        if invoice.creator != creator {
            return Err(BillrError::Unauthorized);
        }

        if invoice.status != InvoiceStatus::Draft {
            return Err(BillrError::InvalidStatus);
        }

        let current_time = env.ledger().timestamp();
        
        if let Some(new_recipient) = recipient {
            if invoice.recipient != new_recipient {
                let old_recipient_invoices: Vec<String> = env // Removed mut
                    .storage()
                    .persistent()
                    .get(&DataKey::RecipientInvoices(invoice.recipient.clone()))
                    .unwrap_or(Vec::new(&env));
                
                let mut new_old_list = Vec::new(&env);
                for id in old_recipient_invoices.iter() {
                    if id != invoice_id {
                        new_old_list.push_back(id);
                    }
                }
                env.storage()
                    .persistent()
                    .set(&DataKey::RecipientInvoices(invoice.recipient.clone()), &new_old_list);

                let mut new_recipient_invoices: Vec<String> = env
                    .storage()
                    .persistent()
                    .get(&DataKey::RecipientInvoices(new_recipient.clone()))
                    .unwrap_or(Vec::new(&env));
                new_recipient_invoices.push_back(invoice_id.clone());
                env.storage()
                    .persistent()
                    .set(&DataKey::RecipientInvoices(new_recipient.clone()), &new_recipient_invoices);

                invoice.recipient = new_recipient;
            }
        }

        if let Some(new_amount) = amount {
            if new_amount == 0 {
                return Err(BillrError::InvalidAmount);
            }
            invoice.amount = new_amount;
        }

        if let Some(new_metadata) = metadata {
            invoice.metadata = new_metadata;
        }

        invoice.last_updated = current_time;
        
        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice_id.clone()), &invoice);

        env.events().publish(
            ("invoice_updated",),
            InvoiceUpdatedEvent {
                invoice_id,
                creator,
                updated_at: current_time,
            },
        );

        Ok(())
    }

    /// Get invoice by ID
    pub fn get_invoice(env: Env, invoice_id: String) -> Option<Invoice> {
        env.storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
    }

    /// List invoices by creator (IDs only)
    pub fn list_by_creator(env: Env, creator: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::CreatorInvoices(creator))
            .unwrap_or(Vec::new(&env))
    }

    /// List invoices by recipient (IDs only)
    pub fn list_by_recipient(env: Env, recipient: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::RecipientInvoices(recipient))
            .unwrap_or(Vec::new(&env))
    }

    /// Get invoices by creator (full details) - FIXED NAME LENGTH
    pub fn get_invoices_by_creator(env: Env, creator: Address) -> Vec<Invoice> {
        let invoice_ids = Self::list_by_creator(env.clone(), creator);
        let mut invoices = Vec::new(&env);
        
        for invoice_id in invoice_ids.iter() {
            if let Some(invoice) = Self::get_invoice(env.clone(), invoice_id) {
                invoices.push_back(invoice);
            }
        }
        
        invoices
    }

    /// Get invoices by recipient (full details)
    pub fn get_invoices_by_recipient(env: Env, recipient: Address) -> Vec<Invoice> {
        let invoice_ids = Self::list_by_recipient(env.clone(), recipient);
        let mut invoices = Vec::new(&env);
        
        for invoice_id in invoice_ids.iter() {
            if let Some(invoice) = Self::get_invoice(env.clone(), invoice_id) {
                invoices.push_back(invoice);
            }
        }
        
        invoices
    }

    /// Get all invoices for address
    pub fn get_all_invoices_for_address(env: Env, address: Address) -> Map<String, Vec<Invoice>> {
        let mut result = Map::new(&env);
        
        let created_invoices = Self::get_invoices_by_creator(env.clone(), address.clone());
        result.set(String::from_str(&env, "created"), created_invoices);
        
        let received_invoices = Self::get_invoices_by_recipient(env.clone(), address);
        result.set(String::from_str(&env, "received"), received_invoices);
        
        result
    }

    /// Get pending invoices
    pub fn get_pending_invoices(env: Env, address: Address) -> Map<String, Vec<Invoice>> {
        let mut result = Map::new(&env);
        
        let created_invoices = Self::get_invoices_by_creator(env.clone(), address.clone());
        let mut pending_sent = Vec::new(&env);
        
        for invoice in created_invoices.iter() {
            match invoice.status {
                InvoiceStatus::Sent | InvoiceStatus::Acknowledged => {
                    pending_sent.push_back(invoice);
                }
                _ => {}
            }
        }
        result.set(String::from_str(&env, "awaiting_payment"), pending_sent);
        
        let received_invoices = Self::get_invoices_by_recipient(env.clone(), address);
        let mut pending_received = Vec::new(&env);
        
        for invoice in received_invoices.iter() {
            match invoice.status {
                InvoiceStatus::Sent | InvoiceStatus::Acknowledged => {
                    pending_received.push_back(invoice);
                }
                _ => {}
            }
        }
        result.set(String::from_str(&env, "pending_action"), pending_received);
        
        result
    }

    /// Get USDC token address
    pub fn get_usdc_token(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::UsdcToken)
    }

    /// Update USDC token address (admin only)
    pub fn update_usdc_token(env: Env, admin: Address, new_usdc_token: Address) -> Result<(), BillrError> {
        admin.require_auth();

        let stored_admin: Option<Address> = env.storage().instance().get(&DataKey::Admin);
        if stored_admin != Some(admin) {
            return Err(BillrError::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&DataKey::UsdcToken, &new_usdc_token);

        Ok(())
    }

    /// Internal helper
    fn get_invoice_internal(env: &Env, invoice_id: &String) -> Result<Invoice, BillrError> {
        env.storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id.clone()))
            .ok_or(BillrError::InvoiceNotFound)
    }
}