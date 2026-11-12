export interface JournalLineInput {
  accountCode: string;
  debitPaise: number;
  creditPaise: number;
  memo?: string;
}

/**
 * Validates that a double-entry journal has at least 2 lines,
 * non-negative integer amounts, and total debits === total credits.
 */
export function assertBalancedJournal(lines: JournalLineInput[]): {
  totalDebitPaise: number;
  totalCreditPaise: number;
} {
  if (lines.length < 2) {
    throw new Error('Double-entry journal requires at least two lines');
  }

  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  for (const line of lines) {
    if (!Number.isInteger(line.debitPaise) || !Number.isInteger(line.creditPaise)) {
      throw new Error('Journal amounts must be integer paise');
    }
    if (line.debitPaise < 0 || line.creditPaise < 0) {
      throw new Error('Journal amounts cannot be negative');
    }
    if (line.debitPaise === 0 && line.creditPaise === 0) {
      throw new Error('Journal line cannot have both zero debit and zero credit');
    }
    totalDebitPaise += line.debitPaise;
    totalCreditPaise += line.creditPaise;
  }

  if (totalDebitPaise !== totalCreditPaise) {
    throw new Error(
      `Unbalanced journal entry: debits (${totalDebitPaise}) !== credits (${totalCreditPaise})`
    );
  }

  return { totalDebitPaise, totalCreditPaise };
}

