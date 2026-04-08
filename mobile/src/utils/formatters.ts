/**
 * Formatters Utility - Consistent formatting across the app
 */

/**
 * Format a date string to a human-readable format
 * @param dateString - ISO date string
 * @param options - Formatting options
 */
export function formatDate(
  dateString: string,
  options: {
    relative?: boolean;
    includeTime?: boolean;
    format?: 'short' | 'medium' | 'long';
  } = {}
): string {
  const { relative = true, includeTime = false, format = 'short' } = options;
  const date = new Date(dateString);
  const now = new Date();

  // Relative dates (Aujourd'hui, Hier)
  if (relative) {
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      if (includeTime) {
        return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return "Aujourd'hui";
    }

    if (diffDays === 1) {
      if (includeTime) {
        return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return 'Hier';
    }
  }

  // Standard date formats
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: format === 'long' ? 'long' : 'short',
  };

  if (format === 'long' || date.getFullYear() !== now.getFullYear()) {
    formatOptions.year = 'numeric';
  }

  let result = date.toLocaleDateString('fr-FR', formatOptions);

  if (includeTime) {
    result += ` à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return result;
}

/**
 * Format a number as currency
 * @param amount - Numeric amount
 * @param options - Currency and display options
 */
export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    showSign?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { currency = 'EPC', showSign = false, compact = false } = options;

  let result: string;

  if (currency === 'EPC') {
    // EPC n'est pas un code ISO 4217 — Intl.NumberFormat crasherait avec style: 'currency'
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      notation: compact && Math.abs(amount) >= 1000 ? 'compact' : 'standard',
    }).format(Math.abs(amount));
    result = `${formatted} EPC`;
  } else {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      notation: compact && Math.abs(amount) >= 1000 ? 'compact' : 'standard',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    result = formatter.format(Math.abs(amount));
  }

  if (showSign && amount !== 0) {
    result = (amount > 0 ? '+' : '-') + result;
  }

  return result;
}

/**
 * Format card number with proper masking
 * @param cardNumber - Full or partial card number
 * @param masked - Whether to mask the middle digits
 */
export function formatCardNumber(cardNumber: string, masked = true): string {
  // Remove all non-digit characters
  const digits = cardNumber.replace(/\D/g, '');

  if (masked && digits.length >= 12) {
    // Show first 4 and last 4, mask the rest
    const first4 = digits.slice(0, 4);
    const last4 = digits.slice(-4);
    return `${first4} **** **** ${last4}`;
  }

  // Format with spaces every 4 digits
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Format an amount for input display (with proper decimal handling)
 * @param value - Current input value
 */
export function formatAmountInput(value: string): string {
  // Allow only digits and one comma/period
  const cleaned = value.replace(/[^\d.,]/g, '');

  // Replace period with comma (French format)
  const withComma = cleaned.replace('.', ',');

  // Ensure only one comma
  const parts = withComma.split(',');
  if (parts.length > 2) {
    return parts[0] + ',' + parts.slice(1).join('');
  }

  // Limit decimal places to 2
  if (parts.length === 2 && parts[1].length > 2) {
    return parts[0] + ',' + parts[1].slice(0, 2);
  }

  return withComma;
}

/**
 * Get initials from a full name
 * @param fullName - Full name string
 * @param maxChars - Maximum number of characters (default 2)
 */
export function getInitials(fullName: string | null | undefined, maxChars = 2): string {
  if (!fullName) return '?';

  return fullName
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, maxChars);
}

/**
 * Format a phone number
 * @param phone - Phone number string
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // French format: 06 12 34 56 78
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  return phone;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
