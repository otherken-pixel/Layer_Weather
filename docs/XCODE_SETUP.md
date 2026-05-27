# Xcode Setup — Layer Weather Widgets & Apple Watch App

All native Swift source files live in `native/ios/` (tracked by git). The Capacitor iOS shell alone only includes the **App** target — widgets and watch targets are added by our setup script.

---

## 0. One-command setup (recommended)

From the project root, with `.env` configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`):

```bash
brew install cocoapods
gem install xcodeproj    # once, for the Xcode wiring script
npm install
npm run ios:prepare    # build, cap sync, pods, icons, widget/watch targets
open ios/App/App.xcworkspace
```

`ios:prepare` runs `scripts/fix-ios-build.sh`, which:

- Builds the web app for native (`build:ios`, no service worker)
- Syncs Capacitor and runs `pod install` in `ios/App`
- Copies the app icon into the asset catalog
- Runs `scripts/setup-xcode-targets.rb` (widget + watch targets, App Group entitlements files, embeds extensions)

### Manual steps still required in Xcode

For each target (**App**, **LayerWeatherWidgets**, **LayerWeatherWatch**, **LayerWeatherWatchComplications**):

1. **Signing & Capabilities** → select your **Team**
2. Confirm **App Groups** shows `group.com.layerweather.shared` (entitlements files are created by the script; enable the capability in the Apple Developer portal if Xcode prompts)

Watch app icon (if missing):

```bash
npm run ios:watch-icon
```

---

## Targets created

| Target | Platform | Purpose |
|--------|----------|---------|
| **App** | iOS 13+ | Capacitor + `WidgetBridgePlugin` + `WatchConnectivityHandler` |
| **LayerWeatherWidgets** | iOS 16+ | Home / Lock Screen widgets |
| **LayerWeatherWatch** | watchOS 10+ | Standalone Watch app |
| **LayerWeatherWatchComplications** | watchOS 10+ | Watch face complications |

Shared App Group: `group.com.layerweather.shared`

---

## Troubleshooting

### `supabaseUrl is required` / blank screen

`.env` must exist **before** `npm run build:ios`. Then `npx cap sync ios` and rebuild in Xcode.

### `Unable to resolve module dependency: Capacitor`

Open **`ios/App/App.xcworkspace`**, not `App.xcodeproj`. Run `npm run ios:pods` from project root.


### Widget / watch show placeholder weather or “Open app to sync”

Capacitor 6 does **not** auto-register local plugins. The setup script patches `Main.storyboard` to use `LayerWeatherBridgeViewController`, which registers `WidgetBridgePlugin` and writes to the App Group.

1. Run `npm run ios:prepare` (or `npm run ios:extensions`)
2. In Xcode console after loading weather, confirm: `To Native -> WidgetBridge saveWidgetData`
3. In the app: **Settings → Widget & Watch → Sync widget & watch now**

If the sync button reports “not registered”, open **Main.storyboard** and set the root view controller to **LayerWeatherBridgeViewController** (Module: **App**).

### `Cannot find WatchConnectivityHandler` / `LayerWeatherBridgeViewController` in scope

Native Swift files are not in the **App** target. Run:

```bash
npm run ios:extensions
```

Clean build in Xcode (Shift+Cmd+K).

### Widget / watch targets missing

```bash
ruby scripts/setup-xcode-targets.rb
# or
npm run ios:extensions
```

### `pod install` — No Podfile found

Run from project root: `npm run ios:pods` (runs in `ios/App`).

---

## Detailed manual setup

See sections below if you prefer to add targets by hand in Xcode instead of the Ruby script.

### 1. App Group (required by ALL extensions)

Every target that reads/writes shared UserDefaults needs the App Group entitlement.

1. Select the **App** target → Signing & Capabilities → **+ Capability → App Groups**
2. Add: `group.com.layerweather.shared`
3. Repeat for **LayerWeatherWidgets**, **LayerWeatherWatch**, and **LayerWeatherWatchComplications**.

---

## 2. Add the Main App Native Files

These files belong to the **App** target (the main Capacitor app). Drag them into the
`App/App/` group in Xcode and ensure "App" is checked in target membership.

```
native/ios/MainApp/LayerWeatherBridgeViewController.swift
native/ios/MainApp/WidgetBridgePlugin.swift
native/ios/MainApp/WatchConnectivityHandler.swift
```

**Capacitor 6:** Register plugins in `LayerWeatherBridgeViewController.capacitorDidLoad()` (the setup script sets this class in `Main.storyboard`):

```swift
override open func capacitorDidLoad() {
    super.capacitorDidLoad()
    bridge?.registerPluginInstance(WidgetBridgePlugin())
    WatchConnectivityHandler.shared.activate()
}
```

Do **not** call `WatchConnectivityHandler` from `AppDelegate` if the bridge view controller is in use (duplicate activation is guarded but unnecessary).

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

### iOS App
```bash
npm run ios:icons
```

### Watch App
```bash
npm run ios:watch-icon
```

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
