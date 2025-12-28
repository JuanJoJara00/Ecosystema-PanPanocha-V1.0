
// packages/types/src/brands.ts

// The unique symbol that "brands" the primitive
declare const __brand: unique symbol;

// The generic Brand type
export type Brand<K, T> = T & { readonly [__brand]: K };

/**
 * Helper to "cast" a primitive to a Brand.
 * NOTE: Use Zod schemas at the API boundary to validate content before casting!
 */
export function toBrand<B extends Brand<any, any>>(value: any): B {
  return value as B;
}

// Domain Brands
export type ProductId = Brand<'ProductId', string>;
export type VariantId = Brand<'VariantId', string>;
export type WarehouseId = Brand<'WarehouseId', string>;
export type UserId = Brand<'UserId', string>;
export type OrderId = Brand<'OrderId', string>;
