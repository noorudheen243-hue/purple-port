# Implementation Plan - Custom Transaction ID

## Goal
Implement a system-generated unique Transaction ID for all Journal entries in the format `QTN[YY][MM][000000]`.

## Proposed Changes

### Database Schema
1.  **Modify `JournalEntry`**: Add `transaction_number` (String, unique).
2.  **Add `TransactionSequence`**: A new model to track the incrementing counter per month/year.
    ```prisma
    model TransactionSequence {
      id        String @id @default(uuid())
      year      Int
      month     Int
      last_seq  Int    @default(0)
      
      @@unique([year, month])
    }
    ```

### Server Logic
1.  **Utilities**: Create `server/src/utils/transactionIdGenerator.ts`.
    -   Function `generateTransactionId(prismaTx)`:
        -   Get current date (IST).
        -   Extract YY, MM.
        -   Upsert `TransactionSequence` for this YY/MM, increment `last_seq` atomically.
        -   Format ID: `QTN${yy}${mm}${seq.toString().padStart(6, '0')}`.
        -   Return string.
2.  **Accounting Service** (`server/src/modules/accounting/service.ts`):
    -   In `createEntry` (and any other creation points), call `generateTransactionId`.
    -   Include `transaction_number` in the `prisma.journalEntry.create` payload.
    -   In `getTransactions`: Add `transaction_number` to the returned object.

### Client Logic
1.  **Interfaces**: Update `Transaction` interface in `client/src/types` (or where defined) to include `transaction_number`.
2.  **Transaction History Page**:
    -   Add "Transaction ID" column to the data table.
    -   Display the `transaction_number` field.

## Verification Plan

### Automated Test
1.  **Script**: Create `server/scripts/test_transaction_id.ts`.
    -   Call `accountingService.createEntry` multiple times.
    -   Verify the IDs generated follow the sequence `QTN2601000001`, `QTN2601000002`, etc. (assuming Jan 2026).
    -   Check uniqueness.
2.  **Execution**: Run `ts-node server/scripts/test_transaction_id.ts`.
