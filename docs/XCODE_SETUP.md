# Xcode Setup — Layer Weather Widgets & Apple Watch App

All native Swift source files live in `native/ios/` (tracked by git). After generating
the iOS project with Capacitor, follow these steps to wire everything into Xcode.

---

## 0. Prerequisites

From the project root, run the one-shot prepare script (recommended):

```bash
npm run ios:prepare
npm run ios:open         # opens App.xcworkspace in Xcode
```

Or step by step:

```bash
npm install
npm run build
npx cap add ios          # generates ios/ if not yet present
npx cap sync ios         # syncs web assets + plugins
cd ios/App && pod install && cd ../..   # CocoaPods live next to the Podfile

# Wire all native Swift targets into the Xcode project automatically:
ruby scripts/setup-xcode-targets.rb

open ios/App/App.xcworkspace   # MUST use .xcworkspace, not .xcodeproj
```

> **Important:** Always open `ios/App/App.xcworkspace`. Opening `App.xcodeproj` directly causes **"Unable to resolve module dependency: Capacitor"** because Xcode cannot see the CocoaPods frameworks.

### Troubleshooting: Capacitor module not found

| Symptom | Fix |
|---------|-----|
| `Unable to resolve module dependency: 'Capacitor'` in `AppDelegate.swift` | Run `npm run ios:prepare`, then open **`App.xcworkspace`** (not `.xcodeproj`) |
| `Sandbox is not in sync with the Podfile.lock` | `cd ios/App && pod install` |
| CocoaPods not installed | `brew install cocoapods` (recommended), or see Bundler section below |
| `Gem::FilePermissionError` on `npx cap sync` | See **Bundler permission error** below |
| Stale Xcode cache | Product → Clean Build Folder; delete Derived Data (Xcode → Settings → Locations) |

### Troubleshooting: Bundler permission error (`Gem::FilePermissionError`)

Capacitor sees the project `Gemfile` and runs `bundle exec pod`. macOS system Ruby cannot write to `/Library/Ruby/Gems`.

**Option A — Homebrew CocoaPods (simplest):**

```bash
brew install cocoapods
mv Gemfile Gemfile.bak    # optional: stops cap sync from using Bundler
npx cap sync ios
cd ios/App && pod install
```

**Option B — Bundler with local gems (keeps the Gemfile):**

```bash
bundle config set --local path vendor/bundle
bundle install
npx cap sync ios
```

The repo includes `.bundle/config` so gems install under `vendor/bundle/` (no sudo).

**Option C — Skip Bundler for one command:**

```bash
export CAPACITOR_COCOAPODS_PATH="$(which pod)"
npx cap sync ios
```

The script (idempotent — safe to re-run) handles:
- Adding `MainApp/` and `Shared/` files to the App target
- Patching `Info.plist` with required usage description strings
- Adding `PrivacyInfo.xcprivacy` to the App bundle
- Patching `AppDelegate.swift` to activate WatchConnectivity
- Creating the **LayerWeatherWidgets** (iOS widget extension) target
- Creating the **LayerWeatherWatch** (standalone Watch App) target
- Creating the **LayerWeatherWatchComplications** (watchOS complications) target

After running the script, complete the manual Xcode steps below (capabilities
require your Apple Developer account and cannot be scripted).

---

## 1. App Group (required by ALL extensions)

Every target that reads/writes shared UserDefaults needs the App Group entitlement.

1. Select the **App** target → Signing & Capabilities → **+ Capability → App Groups**
2. Add: `group.com.layerweather.shared`
3. Repeat this for **LayerWeatherWidgets**, **LayerWeatherWatch**, and **LayerWeatherWatchComplications** targets (created in the steps below).

---

## 2. Add the Main App Native Files

These files belong to the **App** target (the main Capacitor app). Drag them into the
`App/App/` group in Xcode and ensure "App" is checked in target membership.

```
native/ios/MainApp/WidgetBridgePlugin.swift
native/ios/MainApp/WatchConnectivityHandler.swift
```

Then activate WatchConnectivity in `AppDelegate.swift`:
```swift
import WatchConnectivity

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // ... existing Capacitor setup ...
    WatchConnectivityHandler.shared.activate()
    return true
}
```

---

## 3. Add the Widget Extension Target

1. **File → New → Target → Widget Extension**
2. Name: `LayerWeatherWidgets`
3. Deployment Target: **iOS 16.0**
4. Uncheck "Include Configuration Intent"
5. Delete the default placeholder Swift file that Xcode creates; ours replaces it.
6. Add the **App Group** capability: `group.com.layerweather.shared`

### Files to add — drag from `native/ios/` into the `LayerWeatherWidgets` group:

```
native/ios/Shared/AppGroupKeys.swift
native/ios/Shared/SharedWeatherModels.swift
native/ios/LayerWeatherWidgets/SkyGradient.swift
native/ios/LayerWeatherWidgets/WidgetModels.swift
native/ios/LayerWeatherWidgets/WidgetDataProvider.swift
native/ios/LayerWeatherWidgets/Views/SharedWidgetComponents.swift
native/ios/LayerWeatherWidgets/Views/SmallWidget.swift
native/ios/LayerWeatherWidgets/Views/MediumWidget.swift
native/ios/LayerWeatherWidgets/Views/LargeWidget.swift
native/ios/LayerWeatherWidgets/Views/LockScreenWidgets.swift
native/ios/LayerWeatherWidgets/Views/InteractiveWidget.swift
native/ios/LayerWeatherWidgets/LayerWeatherWidgets.swift
```

When Xcode prompts for target membership, check only **LayerWeatherWidgets** (not App).

### Widget target build settings

| Setting | Value |
|---------|-------|
| Deployment Target | iOS 16.0 |
| Swift Language Version | Swift 5 |

---

## 4. Add the Watch App Target

1. **File → New → Target → Watch App** (NOT WatchKit App — use the modern SwiftUI template)
2. Name: `LayerWeatherWatch`
3. Deployment Target: **watchOS 10.0**
4. Uncheck "Include Notification Scene" (not needed)
5. Add the **App Group** capability: `group.com.layerweather.shared`

### Files to add — drag from `native/ios/LayerWeatherWatch/` into the new Watch App group:

```
native/ios/LayerWeatherWatch/WatchSharedModels.swift
native/ios/LayerWeatherWatch/HapticManager.swift
native/ios/LayerWeatherWatch/WatchConnectivityManager.swift
native/ios/LayerWeatherWatch/WatchWeatherService.swift
native/ios/LayerWeatherWatch/OutfitView.swift
native/ios/LayerWeatherWatch/ForecastView.swift
native/ios/LayerWeatherWatch/ConditionsView.swift
native/ios/LayerWeatherWatch/QuickCalibrateView.swift
native/ios/LayerWeatherWatch/ContentView.swift
native/ios/LayerWeatherWatch/LayerWeatherWatchApp.swift
```

> **Note:** `WatchSharedModels.swift` is self-contained — it includes its own `AppGroupKeys`
> definition. Do NOT also add `native/ios/Shared/AppGroupKeys.swift` to watch targets.

---

## 5. Add the Watch Complications Widget Extension

Complications in watchOS 9+ use WidgetKit inside a separate Watch Widget Extension.

1. **File → New → Target → Widget Extension**
2. When prompted for platform, select **watchOS**
3. Name: `LayerWeatherWatchComplications`
4. Deployment Target: **watchOS 10.0**
5. Delete the default placeholder Swift file
6. Add the **App Group** capability: `group.com.layerweather.shared`

### Files to add:

```
native/ios/LayerWeatherWatchComplications/ComplicationProvider.swift
native/ios/LayerWeatherWatch/WatchSharedModels.swift   ← shared with Watch App target
```

> When you add `WatchSharedModels.swift` to the complications target, Xcode will ask
> which targets — check **LayerWeatherWatchComplications** (it's already in Watch App).

### Link complications to the Watch App

Watch App target → **General → Complications** → set bundle to `LayerWeatherWatchComplications`.

---

## 6. App Icons

### Widget Extension
No icon needed — it inherits the main app icon.

### Watch App
Add a **1024×1024** app icon to `LayerWeatherWatch/Assets.xcassets/AppIcon.appiconset/`.
Xcode 15+ generates all watch face sizes automatically from the single 1024×1024 image.

---

## 7. Build Order / Scheme

In **Product → Scheme → Edit Scheme**, ensure the Watch App is set as a companion to the main App scheme so both deploy to your device together.

---

## 8. Verify the Data Bridge

After first build:
1. Run the main app on a real device and navigate to any city
2. Add any Layer Weather widget to the home screen — it should show real data immediately
3. On a paired Apple Watch, open the Layer Weather watch app

To verify UserDefaults are shared: add a temporary breakpoint in `WidgetBridgePlugin.saveWidgetData` and confirm `UserDefaults(suiteName: "group.com.layerweather.shared")` is non-nil.

---

## 9. App Store Submission Checklist

- [ ] All 4 targets share the same Team ID and have `group.com.layerweather.shared` App Group
- [ ] Widget Extension provisioning profile includes WidgetKit entitlement
- [ ] Watch App provisioning profile is "watchOS App" type
- [ ] Watch Complications profile includes WidgetKit  
- [ ] Main App profile includes App Groups + WatchConnectivity
- [ ] Widget privacy manifest updated if widgets surface personal data
- [ ] Watch app icon is 1024×1024 (Xcode auto-generates all sizes)
- [ ] Tested on physical device (WidgetKit requires real hardware, not Simulator)
- [ ] All targets compile with no warnings in release mode

---

## 10. Testing Without a Device

Use the **Widget Preview Canvas** in Xcode. The `#Preview` macros in each Swift file
use `WidgetData.placeholder` so no real UserDefaults data is required. Click the preview
canvas icon (⌘+Option+Return) in any widget view file to see it instantly.

For Simulator testing, run both the main app and the widget extension from the same
Simulator — they share the same App Group container within that Simulator.
