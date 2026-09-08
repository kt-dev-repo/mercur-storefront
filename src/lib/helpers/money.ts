import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  // Optional on purpose. Medusa's line-item totals are optional on the union of
  // StoreCartLineItem | StoreOrderLineItem, and callers were being pushed towards
  // `?? 0` — which prints a confident "$0.00" for a figure we simply do not have.
  // Returning an empty string keeps a missing total blank instead of wrong.
  amount: number | undefined
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  if (amount === undefined || amount === null) {
    return ""
  }

  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    : amount.toString()
}
