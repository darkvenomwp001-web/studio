
'use client';

export type SecurityRuleOperation = 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';

export type SecurityRuleContext = {
  path: string;
  operation: SecurityRuleOperation;
  requestResourceData?: any;
};

/**
 * A custom error class designed to capture detailed context about a 
 * Firestore Security Rule permission failure. This error is intended to be
 * caught and re-thrown by a top-level error listener, which will then be
 * picked up by Next.js's development error overlay.
 */
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
      { context },
      null,
      2
    )}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
