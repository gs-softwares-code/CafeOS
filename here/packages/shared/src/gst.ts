export type GstScheme = 'UNREGISTERED' | 'COMPOSITION' | 'REGULAR';
export type TaxMode = 'EXCLUSIVE' | 'INCLUSIVE';

export interface TaxableLineItem {
  unitPricePaise: number;
  quantity: number;
  gstRateBps: number; // e.g., 500 = 5.00%, 1800 = 18.00%
  discountPaise?: number;
}

export interface LineTaxBreakdown {
  subtotalPaise: number;
  discountPaise: number;
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  lineTotalPaise: number;
}

/**
 * Computes exact integer-paise GST breakdown for a single order line item.
 * Ensures zero floating-point drift in billing and accounting ledgers.
 */
export function calculateLineTax(
  item: TaxableLineItem,
  options: {
    scheme: GstScheme;
    taxMode: TaxMode;
    isInterState?: boolean;
  }
): LineTaxBreakdown {
  const grossPaise = Math.max(0, Math.round(item.unitPricePaise * item.quantity));
  const discountPaise = Math.min(grossPaise, Math.max(0, item.discountPaise ?? 0));
  const netAmountPaise = grossPaise - discountPaise;

  if (options.scheme !== 'REGULAR' || item.gstRateBps <= 0) {
    return {
      subtotalPaise: grossPaise,
      discountPaise,
      taxableValuePaise: netAmountPaise,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalTaxPaise: 0,
      lineTotalPaise: netAmountPaise,
    };
  }

  let taxableValuePaise = netAmountPaise;
  let totalTaxPaise = 0;

  if (options.taxMode === 'INCLUSIVE') {
    taxableValuePaise = Math.round(
      (netAmountPaise * 10000) / (10000 + item.gstRateBps)
    );
    totalTaxPaise = netAmountPaise - taxableValuePaise;
  } else {
    totalTaxPaise = Math.round((netAmountPaise * item.gstRateBps) / 10000);
  }

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (options.isInterState) {
    igstPaise = totalTaxPaise;
  } else {
    cgstPaise = Math.floor(totalTaxPaise / 2);
    sgstPaise = totalTaxPaise - cgstPaise;
  }

  return {
    subtotalPaise: grossPaise,
    discountPaise,
    taxableValuePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalTaxPaise,
    lineTotalPaise: taxableValuePaise + totalTaxPaise,
  };
}

/**
 * Formats integer paise to INR currency string (e.g., 12500 -> "₹125.00").
 */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

