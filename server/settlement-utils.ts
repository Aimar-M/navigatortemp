import { User } from "@shared/schema";

export interface PaymentMethodInfo {
  hasVenmo: boolean;
  hasPayPal: boolean;
  venmoUsername?: string;
  paypalEmail?: string;
}

export function detectPaymentMethods(user: User): PaymentMethodInfo {
  return {
    hasVenmo: !!(user.venmoUsername && user.venmoUsername.trim()),
    hasPayPal: !!(user.paypalEmail && user.paypalEmail.trim()),
    venmoUsername: user.venmoUsername || undefined,
    paypalEmail: user.paypalEmail || undefined,
  };
}

export function generateVenmoPaymentLink(username: string, amount: number, note: string): string {
  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  const encodedNote = encodeURIComponent(note);
  return `https://venmo.com/pay/${cleanUsername}?amount=${amount}&note=${encodedNote}`;
}

export function generatePayPalPaymentLink(email: string, amount: number, note: string): string {
  // PayPal.me requires usernames, not emails. Since we only have email, 
  // we'll generate a basic PayPal payment request URL
  const encodedNote = encodeURIComponent(note);
  const encodedEmail = encodeURIComponent(email);
  return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodedEmail}&amount=${amount}&item_name=${encodedNote}&currency_code=USD`;
}

export function generateSettlementNote(payerName: string, tripName: string): string {
  return `Trip settlement: ${tripName} - from ${payerName}`;
}

export interface SettlementOption {
  method: 'venmo' | 'paypal' | 'cash';
  displayName: string;
  paymentLink?: string;
  available: boolean;
}

export function getSettlementOptions(
  payee: User,
  amount: number,
  payerName: string,
  tripName: string
): SettlementOption[] {
  const paymentMethods = detectPaymentMethods(payee);
  const note = generateSettlementNote(payerName, tripName);
  const options: SettlementOption[] = [];

  if (paymentMethods.hasVenmo) {
    options.push({
      method: 'venmo',
      displayName: 'Venmo',
      paymentLink: generateVenmoPaymentLink(paymentMethods.venmoUsername!, amount, note),
      available: true,
    });
  }

  if (paymentMethods.hasPayPal) {
    options.push({
      method: 'paypal',
      displayName: 'PayPal',
      paymentLink: generatePayPalPaymentLink(paymentMethods.paypalEmail!, amount, note),
      available: true,
    });
  }

  // Always offer cash option
  options.push({
    method: 'cash',
    displayName: 'Settle in Cash',
    available: true,
  });

  return options;
}