import Swal from 'sweetalert2'
import type { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2'

const BRAND_CLASSES = {
  popup: 'cns-swal-popup',
  title: 'cns-swal-title',
  htmlContainer: 'cns-swal-text',
  confirmButton: 'cns-swal-confirm',
  cancelButton: 'cns-swal-cancel',
  actions: 'cns-swal-actions',
  icon: 'cns-swal-icon',
  closeButton: 'cns-swal-close',
  timerProgressBar: 'cns-swal-timer',
} as const

const originalFire = Swal.fire.bind(Swal)

const BRAND_DEFAULTS: SweetAlertOptions = {
  buttonsStyling: false,
  customClass: BRAND_CLASSES,
  confirmButtonText: 'OK',
  cancelButtonText: 'Cancel',
  backdrop: 'rgba(15, 23, 42, 0.5)',
}

function getPopupVariantClass(icon?: SweetAlertIcon, isToast?: boolean): string {
  if (isToast) {
    const toastBase = `${BRAND_CLASSES.popup} cns-swal-toast`
    if (icon === 'success') return `${toastBase} cns-swal-toast-success`
    if (icon === 'error') return `${toastBase} cns-swal-toast-error`
    if (icon === 'warning') return `${toastBase} cns-swal-toast-warning`
    if (icon === 'question') return `${toastBase} cns-swal-toast-question`
    if (icon === 'info') return `${toastBase} cns-swal-toast-info`
    return `${toastBase} cns-swal-toast-brand`
  }

  const base = BRAND_CLASSES.popup
  if (icon === 'success') return `${base} cns-swal-popup-success`
  if (icon === 'error') return `${base} cns-swal-popup-error`
  if (icon === 'warning') return `${base} cns-swal-popup-warning`
  if (icon === 'question') return `${base} cns-swal-popup-question`
  if (icon === 'info') return `${base} cns-swal-popup-info`
  return `${base} cns-swal-popup-brand`
}

function getConfirmClass(icon?: SweetAlertIcon): string {
  if (icon === 'success') return `${BRAND_CLASSES.confirmButton} cns-swal-confirm-success`
  if (icon === 'error' || icon === 'warning') {
    return `${BRAND_CLASSES.confirmButton} cns-swal-confirm-danger`
  }
  if (icon === 'question') return `${BRAND_CLASSES.confirmButton} cns-swal-confirm-neutral`
  return BRAND_CLASSES.confirmButton
}

function stripInlineTheme(options: SweetAlertOptions): SweetAlertOptions {
  const next = { ...options }
  delete (next as Record<string, unknown>).background
  delete (next as Record<string, unknown>).color
  delete (next as Record<string, unknown>).confirmButtonColor
  delete (next as Record<string, unknown>).cancelButtonColor
  return next
}

function normalizeOptions(options: SweetAlertOptions): SweetAlertOptions {
  const merged = stripInlineTheme({ ...BRAND_DEFAULTS, ...options } as SweetAlertOptions)
  const isToast = Boolean(merged.toast)
  const popupClass = getPopupVariantClass(merged.icon, isToast)

  return stripInlineTheme({
    ...merged,
    buttonsStyling: false,
    customClass: {
      ...BRAND_CLASSES,
      ...merged.customClass,
      popup: merged.customClass?.popup || popupClass,
      confirmButton:
        merged.customClass?.confirmButton || getConfirmClass(merged.icon),
    },
  }) as SweetAlertOptions
}

export function fire(options: SweetAlertOptions) {
  return originalFire(normalizeOptions(options))
}

export function toast(options: SweetAlertOptions) {
  return fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    ...options,
  })
}

export function confirm(options: SweetAlertOptions) {
  return fire({
    showCancelButton: true,
    focusCancel: true,
    reverseButtons: true,
    ...options,
  })
}

let isPatched = false

/** Apply branded defaults to all `Swal.fire()` calls across the app. */
export function setupBrandedSwal() {
  if (isPatched || typeof window === 'undefined') return
  isPatched = true

  Swal.fire = ((options?: SweetAlertOptions | string, ...rest: unknown[]) => {
    if (typeof options === 'string') {
      return originalFire(options, ...(rest as [string?]))
    }
    return fire(options || {})
  }) as typeof Swal.fire
}

export { Swal }
