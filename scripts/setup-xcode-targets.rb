#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Wire all native Swift extensions into the Xcode project.
#
# Run once from the project root AFTER:
#   npx cap add ios
#   cd ios && pod install
#   cd ..        ← back to project root
#
# Then:
#   ruby scripts/setup-xcode-targets.rb
#
# Idempotent — safe to re-run.

begin
  require 'xcodeproj'
rescue LoadError
  abort "ERROR: xcodeproj gem not found.\nRun: gem install xcodeproj\n(CocoaPods usually installs it; try: gem list xcodeproj)"
end
require 'fileutils'
require 'pathname'

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT      = Pathname.new(File.expand_path('..', __dir__))
PROJ_PATH = ROOT / 'ios/App/App.xcodeproj'
APP_SRC   = ROOT / 'ios/App/App'
NATIVE    = ROOT / 'native/ios'
BUNDLE_ID = 'com.layerweather.app'

unless PROJ_PATH.exist?
  abort <<~MSG
    ERROR: #{PROJ_PATH} not found.

    Run first:
      npx cap add ios
      cd ios && pod install
      cd ..
      ruby scripts/setup-xcode-targets.rb
  MSG
end

puts "Opening #{PROJ_PATH.relative_path_from(ROOT)}…"
project = Xcodeproj::Project.open(PROJ_PATH.to_s)

# ── Helpers ────────────────────────────────────────────────────────────────

def find_or_add_group(parent, name)
  parent.find_subpath(name, false) || parent.new_group(name)
end

# Add a Swift source file to a target using an absolute-path file reference.
# Skips silently if a reference with the same basename already exists in group.
def add_source(target, group, abs_path)
  abs_path = abs_path.to_s
  basename  = File.basename(abs_path)

  if group.files.any? { |f| File.basename(f.path.to_s) == basename }
    puts "  ↩  #{basename} (already present)"
    return
  end

  ref = group.new_reference(abs_path)
  ref.source_tree          = '<absolute>'
  ref.last_known_file_type = 'sourcecode.swift'
  target.source_build_phase.add_file_reference(ref, true)
  puts "  +  #{basename} → #{target.name}"
end

def write_plist(path, content)
  path = path.to_s
  FileUtils.mkdir_p(File.dirname(path))
  if File.exist?(path)
    puts "  ↩  #{File.basename(path)} (already exists)"
  else
    File.write(path, content)
    puts "  +  #{File.basename(path)}"
  end
end

def target_exists?(project, name)
  project.targets.any? { |t| t.name == name }
end

# Embed an app extension product into a host (iOS App or watchOS App). xcodeproj does not do this automatically.
def embed_app_extension(host_target, extension_target)
  ref = extension_target.product_reference

  unless host_target.dependencies.any? { |dep| dep.target == extension_target }
    host_target.add_dependency(extension_target)
  end

  phase_name = 'Embed App Extensions'
  phase = host_target.copy_files_build_phases.find { |p| p.name == phase_name } ||
          host_target.new_copy_files_build_phase(phase_name).tap do |p|
            p.symbol_dst_subfolder_spec = :plug_ins
          end
  return if phase.files.any? { |bf| bf.file_ref == ref }

  phase.add_file_reference(ref, true)
end

# ══════════════════════════════════════════════════════════════════════════
# PHASE 1 — Add native files to the existing App (Capacitor) target
# ══════════════════════════════════════════════════════════════════════════
puts "\n── Phase 1: App target ──────────────────────────────────────────────"

main_target = project.targets.find { |t| t.name == 'App' }
abort "ERROR: 'App' target not found in project." unless main_target

app_group    = project.main_group.find_subpath('App', false) ||
               project.main_group.new_group('App', APP_SRC.to_s)
native_group = find_or_add_group(app_group, 'NativeExtensions')
main_grp     = find_or_add_group(native_group, 'MainApp')
shared_grp   = find_or_add_group(native_group, 'Shared')

add_source(main_target, main_grp, NATIVE / 'MainApp/WidgetBridgePlugin.swift')
add_source(main_target, main_grp, NATIVE / 'MainApp/WatchConnectivityHandler.swift')
add_source(main_target, shared_grp, NATIVE / 'Shared/AppGroupKeys.swift')
add_source(main_target, shared_grp, NATIVE / 'Shared/SharedWeatherModels.swift')

# ── Patch Info.plist ───────────────────────────────────────────────────────
info_plist_path = APP_SRC / 'Info.plist'
if info_plist_path.exist?
  content = File.read(info_plist_path)
  if content.include?('NSLocationWhenInUseUsageDescription')
    puts "  ↩  Info.plist already patched"
  else
    patch = <<~XML
      \t<key>NSLocationWhenInUseUsageDescription</key>
      \t<string>Layer Weather uses your location to fetch accurate local weather and generate outfit recommendations for your area.</string>
      \t<key>NSUserNotificationUsageDescription</key>
      \t<string>Layer Weather can alert you when weather changes significantly during your commute or when outdoor conditions warrant a wardrobe update.</string>
    XML
    File.write(info_plist_path, content.sub('</dict>', "#{patch}</dict>"))
    puts "  +  Info.plist patched (location + notification usage strings)"
  end
else
  puts "  ⚠  Info.plist not found at #{info_plist_path} — skipped"
end

# ── Add PrivacyInfo.xcprivacy ──────────────────────────────────────────────
privacy_dest = APP_SRC / 'PrivacyInfo.xcprivacy'
unless privacy_dest.exist?
  FileUtils.cp(ROOT / 'ios-config/PrivacyInfo.xcprivacy', privacy_dest)
  ref = app_group.new_reference(privacy_dest.to_s)
  ref.source_tree = '<absolute>'
  ref.last_known_file_type = 'text.xml'
  main_target.resources_build_phase.add_file_reference(ref, true)
  puts "  +  PrivacyInfo.xcprivacy added to App resources"
else
  puts "  ↩  PrivacyInfo.xcprivacy (already present)"
end

# ── Patch AppDelegate.swift ────────────────────────────────────────────────
delegate_path = APP_SRC / 'AppDelegate.swift'
if delegate_path.exist?
  src = File.read(delegate_path)
  if src.include?('WatchConnectivityHandler')
    puts "  ↩  AppDelegate.swift already patched"
  else
    # Add import after the last import line
    src = src.sub(/(import \S+\n)(?!import)/, "\\1import WatchConnectivity\n")
    # Insert activation before the final `return true` in didFinishLaunchingWithOptions
    src = src.sub(
      /(didFinishLaunchingWithOptions[^}]+?)(return true)/m,
      "\\1WatchConnectivityHandler.shared.activate()\n        \\2"
    )
    File.write(delegate_path, src)
    puts "  +  AppDelegate.swift patched (WatchConnectivityHandler.shared.activate)"
  end
else
  puts "  ⚠  AppDelegate.swift not found at #{delegate_path} — skipped"
end

# ══════════════════════════════════════════════════════════════════════════
# Info.plist content for each extension target
# ══════════════════════════════════════════════════════════════════════════

WIDGETS_PLIST = <<~XML
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Layer Weather Widgets</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
      <key>NSExtensionPointIdentifier</key>
      <string>com.apple.widgetkit-extension</string>
    </dict>
  </dict>
  </plist>
XML

WATCH_PLIST = <<~XML
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Layer Weather</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>WKApplication</key>
    <true/>
  </dict>
  </plist>
XML

COMPLICATIONS_PLIST = <<~XML
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Layer Weather Complications</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
      <key>NSExtensionPointIdentifier</key>
      <string>com.apple.widgetkit-extension</string>
    </dict>
  </dict>
  </plist>
XML

# ══════════════════════════════════════════════════════════════════════════
# PHASE 2 — LayerWeatherWidgets (iOS Widget Extension)
# ══════════════════════════════════════════════════════════════════════════
puts "\n── Phase 2: LayerWeatherWidgets ─────────────────────────────────────"

if target_exists?(project, 'LayerWeatherWidgets')
  puts "  ↩  target already exists (skipped)"
else
  widgets_dir = APP_SRC / 'LayerWeatherWidgets'
  write_plist(widgets_dir / 'Info.plist', WIDGETS_PLIST)

  wt = project.new_target(:app_extension, 'LayerWeatherWidgets', :ios, '16.0')
  wt.build_configurations.each do |c|
    c.build_settings.merge!(
      'PRODUCT_BUNDLE_IDENTIFIER'  => "#{BUNDLE_ID}.widgets",
      'SWIFT_VERSION'              => '5.0',
      'IPHONEOS_DEPLOYMENT_TARGET' => '16.0',
      'INFOPLIST_FILE'             => 'App/LayerWeatherWidgets/Info.plist',
      'CODE_SIGN_STYLE'            => 'Automatic',
      'SKIP_INSTALL'               => 'YES',
    )
  end

  wg      = find_or_add_group(project.main_group, 'LayerWeatherWidgets')
  wg_sh   = find_or_add_group(wg, 'Shared')
  wg_v    = find_or_add_group(wg, 'Views')

  add_source(wt, wg_sh, NATIVE / 'Shared/AppGroupKeys.swift')
  add_source(wt, wg_sh, NATIVE / 'Shared/SharedWeatherModels.swift')
  add_source(wt, wg,   NATIVE / 'LayerWeatherWidgets/LayerWeatherWidgets.swift')
  add_source(wt, wg,   NATIVE / 'LayerWeatherWidgets/SkyGradient.swift')
  add_source(wt, wg,   NATIVE / 'LayerWeatherWidgets/WidgetDataProvider.swift')
  add_source(wt, wg,   NATIVE / 'LayerWeatherWidgets/WidgetModels.swift')
  add_source(wt, wg_v, NATIVE / 'LayerWeatherWidgets/Views/SharedWidgetComponents.swift')
  add_source(wt, wg_v, NATIVE / 'LayerWeatherWidgets/Views/SmallWidget.swift')
  add_source(wt, wg_v, NATIVE / 'LayerWeatherWidgets/Views/MediumWidget.swift')
  add_source(wt, wg_v, NATIVE / 'LayerWeatherWidgets/Views/LargeWidget.swift')
  add_source(wt, wg_v, NATIVE / 'LayerWeatherWidgets/Views/LockScreenWidgets.swift')
  add_source(wt, wg_v, NATIVE / 'LayerWeatherWidgets/Views/InteractiveWidget.swift')

  puts "  ✓  LayerWeatherWidgets target created (12 source files)"
end

if (wt = project.targets.find { |t| t.name == 'LayerWeatherWidgets' })
  embed_app_extension(main_target, wt)
  puts "  ✓  LayerWeatherWidgets embedded in App"
end

# ══════════════════════════════════════════════════════════════════════════
# PHASE 3 — LayerWeatherWatch (standalone SwiftUI Watch App)
# ══════════════════════════════════════════════════════════════════════════
puts "\n── Phase 3: LayerWeatherWatch ───────────────────────────────────────"

if target_exists?(project, 'LayerWeatherWatch')
  puts "  ↩  target already exists (skipped)"
else
  watch_dir = APP_SRC / 'LayerWeatherWatch'
  write_plist(watch_dir / 'Info.plist', WATCH_PLIST)

  # Create as watch2_app then switch product_type to the modern standalone app type
  wwatch = project.new_target(:watch2_app, 'LayerWeatherWatch', :watchos, '10.0')
  wwatch.product_type = 'com.apple.product-type.application'
  wwatch.build_configurations.each do |c|
    c.build_settings.merge!(
      'PRODUCT_BUNDLE_IDENTIFIER'  => "#{BUNDLE_ID}.watchapp",
      'SWIFT_VERSION'              => '5.0',
      'WATCHOS_DEPLOYMENT_TARGET'  => '10.0',
      'SDKROOT'                    => 'watchos',
      'TARGETED_DEVICE_FAMILY'     => '4',
      'INFOPLIST_FILE'             => 'App/LayerWeatherWatch/Info.plist',
      'GENERATE_INFOPLIST_FILE'    => 'NO',
      'CODE_SIGN_STYLE'            => 'Automatic',
    )
  end

  wg = find_or_add_group(project.main_group, 'LayerWeatherWatch')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/LayerWeatherWatchApp.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/ContentView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/ConditionsView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/ForecastView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/OutfitView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/QuickCalibrateView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/HapticManager.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/WatchConnectivityManager.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/WatchSharedModels.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/WatchWeatherService.swift')

  puts "  ✓  LayerWeatherWatch target created (10 source files)"
end

# ══════════════════════════════════════════════════════════════════════════
# PHASE 4 — LayerWeatherWatchComplications (watchOS Widget Extension)
# ══════════════════════════════════════════════════════════════════════════
puts "\n── Phase 4: LayerWeatherWatchComplications ──────────────────────────"

if target_exists?(project, 'LayerWeatherWatchComplications')
  puts "  ↩  target already exists (skipped)"
else
  comp_dir = APP_SRC / 'LayerWeatherWatchComplications'
  write_plist(comp_dir / 'Info.plist', COMPLICATIONS_PLIST)

  ct = project.new_target(:app_extension, 'LayerWeatherWatchComplications', :watchos, '10.0')
  ct.build_configurations.each do |c|
    c.build_settings.merge!(
      'PRODUCT_BUNDLE_IDENTIFIER'  => "#{BUNDLE_ID}.watchapp.complications",
      'SWIFT_VERSION'              => '5.0',
      'WATCHOS_DEPLOYMENT_TARGET'  => '10.0',
      'SDKROOT'                    => 'watchos',
      'TARGETED_DEVICE_FAMILY'     => '4',
      'INFOPLIST_FILE'             => 'App/LayerWeatherWatchComplications/Info.plist',
      'CODE_SIGN_STYLE'            => 'Automatic',
      'SKIP_INSTALL'               => 'YES',
    )
  end

  cg     = find_or_add_group(project.main_group, 'LayerWeatherWatchComplications')
  cg_sh  = find_or_add_group(cg, 'Shared')
  add_source(ct, cg,   NATIVE / 'LayerWeatherWatchComplications/ComplicationProvider.swift')
  add_source(ct, cg_sh, NATIVE / 'LayerWeatherWatch/WatchSharedModels.swift')

  puts "  ✓  LayerWeatherWatchComplications target created (2 source files)"
end

wwatch = project.targets.find { |t| t.name == 'LayerWeatherWatch' }
ct = project.targets.find { |t| t.name == 'LayerWeatherWatchComplications' }
if wwatch && ct
  embed_app_extension(wwatch, ct)
  puts "  ✓  LayerWeatherWatchComplications embedded in LayerWeatherWatch"
end

# ══════════════════════════════════════════════════════════════════════════
# Save
# ══════════════════════════════════════════════════════════════════════════
project.save
puts "\n✅  Project saved: #{PROJ_PATH.relative_path_from(ROOT)}"

puts <<~DONE

  ──────────────────────────────────────────────────────────────────────────
  Done. Reopen the workspace in Xcode:
    open ios/App/App.xcworkspace

  MANUAL STEPS STILL REQUIRED in Xcode (Signing & Capabilities tab):
    1. App target          → + App Groups → group.com.layerweather.shared
                           → + Push Notifications
                           → + WeatherKit
    2. LayerWeatherWidgets → + App Groups → group.com.layerweather.shared
    3. LayerWeatherWatch   → + App Groups → group.com.layerweather.shared
    4. LayerWeatherWatchComplications → + App Groups → group.com.layerweather.shared
    5. Watch App icon: add 1024×1024 PNG to
       ios/App/App/LayerWeatherWatch/Assets.xcassets/AppIcon.appiconset/
    6. Scheme → Watch App companion: Run → Watch App = LayerWeatherWatch

  See docs/XCODE_SETUP.md §7–9 for the full submission checklist.
  ──────────────────────────────────────────────────────────────────────────
DONE
