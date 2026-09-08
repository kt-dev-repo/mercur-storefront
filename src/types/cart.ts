import { HttpTypes } from "@medusajs/types"

export interface Cart extends HttpTypes.StoreCart {
  // `promotions` is NOT redeclared. StoreCart already declares it as
  // `StoreCartPromotion[]`, and narrowing it here to `StorePromotion[] | undefined`
  // made Cart stop being a StoreCart — so every `Cart` passed to something expecting a
  // `StoreCart` was an error. Nothing needed the narrower type: every use site treats
  // the elements as `any` and guards with optional chaining.
  discount_subtotal?: number
}

export interface StoreCartLineItemOptimisticUpdate
  extends Partial<HttpTypes.StoreCartLineItem> {
  tax_total: number
}
