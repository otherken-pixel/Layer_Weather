import Capacitor
import StoreKit

/// Capacitor plugin exposing StoreKit 2 subscription management to the React layer.
/// Requires iOS 15+. Register in LayerWeatherBridgeViewController.capacitorDidLoad().
///
/// Notes:
/// - All StoreKit types are fully qualified to avoid the SwiftUI.Transaction collision.
/// - jwsRepresentation lives on VerificationResult<Transaction>, not on Transaction itself.
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "loadProducts",          returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase",              returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentEntitlement", returnType: CAPPluginReturnPromise),
    ]

    private var updateListenerTask: Task<Void, Never>?

    override public func load() {
        if #available(iOS 15.0, *) {
            startUpdateListener()
        }
    }

    deinit {
        updateListenerTask?.cancel()
    }

    @available(iOS 15.0, *)
    private func startUpdateListener() {
        updateListenerTask = Task.detached { [weak self] in
            // Explicit type annotation forces StoreKit.Transaction resolution.
            // jwsRepresentation is on VerificationResult, not on the unwrapped Transaction.
            for await verificationResult: VerificationResult<StoreKit.Transaction>
                    in StoreKit.Transaction.updates {
                guard let self else { return }
                if case let .verified(transaction) = verificationResult {
                    await transaction.finish()
                    self.notifyListeners("transactionUpdated", data: [
                        "jwsTransaction": verificationResult.jwsRepresentation,
                    ])
                }
            }
        }
    }

    @objc func loadProducts(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15 or later")
            return
        }
        guard let ids = call.getArray("productIds") as? [String], !ids.isEmpty else {
            call.reject("productIds array is required")
            return
        }
        Task {
            do {
                let products = try await StoreKit.Product.products(for: Set(ids))
                let mapped: [[String: Any]] = products.map { p in
                    var item: [String: Any] = [
                        "id":           p.id,
                        "displayName":  p.displayName,
                        "description":  p.description,
                        "displayPrice": p.displayPrice,
                    ]
                    if let offer = p.subscription?.introductoryOffer {
                        var offerMap: [String: Any] = ["displayPrice": offer.displayPrice]
                        // paymentMode distinguishes free trial from discounted pricing
                        switch offer.paymentMode {
                        case .freeTrial:  offerMap["type"] = "freeTrial"
                        case .payAsYouGo: offerMap["type"] = "introductoryPrice"
                        case .payUpFront: offerMap["type"] = "payUpFront"
                        default:          offerMap["type"] = "unknown"
                        }
                        switch offer.period.unit {
                        case .day:   offerMap["periodUnit"] = "day"
                        case .week:  offerMap["periodUnit"] = "week"
                        case .month: offerMap["periodUnit"] = "month"
                        case .year:  offerMap["periodUnit"] = "year"
                        @unknown default: offerMap["periodUnit"] = "day"
                        }
                        offerMap["periodValue"] = offer.period.value
                        item["introductoryOffer"] = offerMap
                    }
                    return item
                }
                call.resolve(["products": mapped])
            } catch {
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15 or later")
            return
        }
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task {
            do {
                let products = try await StoreKit.Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("PRODUCT_NOT_FOUND: \(productId)")
                    return
                }
                let purchaseResult = try await product.purchase()
                switch purchaseResult {
                case .success(let verificationResult):
                    switch verificationResult {
                    case .verified(let transaction):
                        await transaction.finish()
                        // jwsRepresentation is on the VerificationResult envelope
                        call.resolve(["jwsTransaction": verificationResult.jwsRepresentation])
                    case .unverified(_, let err):
                        call.reject("UNVERIFIED: \(err.localizedDescription)")
                    }
                case .userCancelled:
                    call.reject("USER_CANCELLED")
                case .pending:
                    call.reject("PENDING")
                @unknown default:
                    call.reject("UNKNOWN_RESULT")
                }
            } catch {
                call.reject("PURCHASE_ERROR: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15 or later")
            return
        }
        Task {
            var transactions: [[String: Any]] = []
            for await verificationResult: VerificationResult<StoreKit.Transaction>
                    in StoreKit.Transaction.currentEntitlements {
                if case .verified = verificationResult {
                    transactions.append(["jwsTransaction": verificationResult.jwsRepresentation])
                }
            }
            call.resolve(["transactions": transactions])
        }
    }

    @objc func getCurrentEntitlement(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(entitlementNotFound())
            return
        }
        Task {
            for await verificationResult: VerificationResult<StoreKit.Transaction>
                    in StoreKit.Transaction.currentEntitlements {
                if case let .verified(tx) = verificationResult,
                   tx.productType == StoreKit.Product.ProductType.autoRenewable {
                    let tier = tx.productID.contains("monthly") ? "monthly" : "annual"
                    // rawValue 1 == OfferType.introductoryOffer; avoids nested-type lookup collision
                    let isTrialing = tx.offerType?.rawValue == 1
                    let expiresAt = tx.expirationDate.map {
                        ISO8601DateFormatter().string(from: $0)
                    } ?? ""
                    call.resolve([
                        "isActive":              true,
                        "jwsTransaction":        verificationResult.jwsRepresentation,
                        "productId":             tx.productID,
                        "tier":                  tier,
                        "expiresAt":             expiresAt,
                        "isTrialing":            isTrialing,
                        "originalTransactionId": String(tx.originalID),
                    ])
                    return
                }
            }
            call.resolve(entitlementNotFound())
        }
    }

    private func entitlementNotFound() -> [String: Any] {
        [
            "isActive":              false,
            "jwsTransaction":        NSNull(),
            "productId":             NSNull(),
            "tier":                  NSNull(),
            "expiresAt":             NSNull(),
            "isTrialing":            false,
            "originalTransactionId": NSNull(),
        ]
    }
}
