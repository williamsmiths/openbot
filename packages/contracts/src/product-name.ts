/**
 * The product name that people read: notification and window titles, the default server name and
 * the app information. The i18n catalogs have the same name (`scripts/fork/rename-product-text.py`).
 *
 * Only a display name. `app.setName("OpenBot")`, `productName` and `appId` stay: Electron derives the
 * user data folder and the macOS keychain item that encrypts the sign-in and provider keys from them.
 */
export const PRODUCT_NAME = "kongCowork";
