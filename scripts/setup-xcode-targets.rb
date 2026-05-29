#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Wire all native Swift extensions into the Xcode project.
#
# Run from project root (or use: npm run ios:prepare)
#   npm run ios:prepare   # build, pods, this script
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
APP_GROUP = 'group.com.layerweather.shared'
ENTITLEMENTS_TEMPLATE = ROOT / 'ios-config/AppGroup.entitlements'

unless PROJ_PATH.exist?
  abort <<~MSG
    ERROR: #{PROJ_PATH} not found.

    Run first:
      npm run ios:prepare
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
def file_in_compile_phase?(target, basename)
  target.source_build_phase.files.any? do |build_file|
    ref = build_file.file_ref
    ref && File.basename(ref.path.to_s) == basename
  end
end

def add_source(target, group, abs_path)
  abs_path = abs_path.to_s
  basename = File.basename(abs_path)

  unless File.exist?(abs_path)
    puts "  ⚠  #{basename} not found at #{abs_path}"
    return
  end

  if file_in_compile_phase?(target, basename)
    puts "  ↩  #{basename} (already compiled by #{target.name})"
    return
  end

  ref = group.files.find { |f| File.basename(f.path.to_s) == basename }
  if ref
    puts "  ↳  #{basename} (adding file ref to #{target.name} compile sources)"
  else
    ref = group.new_reference(abs_path)
    # new_reference computes a relative path from the group's location, but we
    # want a true absolute path so the file resolves identically regardless of
    # how deep the group sits in the hierarchy.
    ref.path = abs_path
    ref.source_tree = '<absolute>'
    ref.last_known_file_type = 'sourcecode.swift'
    puts "  +  #{basename} → #{target.name}"
  end
  target.source_build_phase.add_file_reference(ref, true)
end

def add_system_framework(project, target, framework_name)
  path = "System/Library/Frameworks/#{framework_name}.framework"
  ref = project.frameworks_group.files.find { |f| f.path == path } ||
        project.frameworks_group.new_reference(path)
  ref.source_tree = 'SDKROOT'
  ref.last_known_file_type = 'wrapper.framework'
  return if target.frameworks_build_phase.files.any? { |bf| bf.file_ref == ref }

  target.frameworks_build_phase.add_file_reference(ref, true)
  puts "  +  linked #{framework_name}.framework → #{target.name}"
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

# NOTE: There used to be an embed_watch_content helper here. It caused Xcode
# to classify the resulting archive as "Generic Xcode Archive" instead of an
# iOS App Archive — meaning the App Store distribution method was missing.
# The reliable way to embed a watch app into an iOS host is through Xcode's
# General → Frameworks, Libraries, and Embedded Content UI, which we now
# document as a manual setup step rather than scripting.

# Copy the App Group entitlements template to `dest_abs_path` (if missing)
# and wire CODE_SIGN_ENTITLEMENTS = `build_setting_path` on every build config
# of `target`. Idempotent.
def attach_app_group_entitlements(target, build_setting_path, dest_abs_path)
  dest_abs_path = Pathname.new(dest_abs_path.to_s)
  FileUtils.mkdir_p(dest_abs_path.dirname)
  if dest_abs_path.exist?
    puts "  ↩  #{dest_abs_path.basename} (already present)"
  else
    FileUtils.cp(ENTITLEMENTS_TEMPLATE.to_s, dest_abs_path.to_s)
    puts "  +  #{dest_abs_path.basename} copied from ios-config/AppGroup.entitlements"
  end

  target.build_configurations.each do |c|
    c.build_settings['CODE_SIGN_ENTITLEMENTS'] = build_setting_path
  end
  puts "  ✓  #{target.name}: CODE_SIGN_ENTITLEMENTS → #{build_setting_path}"
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

add_source(main_target, main_grp, NATIVE / 'MainApp/LayerWeatherBridgeViewController.swift')
add_source(main_target, main_grp, NATIVE / 'MainApp/WidgetBridgePlugin.swift')
add_source(main_target, main_grp, NATIVE / 'MainApp/StoreKitPlugin.swift')
add_source(main_target, main_grp, NATIVE / 'MainApp/WatchConnectivityHandler.swift')
add_source(main_target, shared_grp, NATIVE / 'Shared/AppGroupKeys.swift')
add_source(main_target, shared_grp, NATIVE / 'Shared/LastCoordinates.swift')
add_source(main_target, shared_grp, NATIVE / 'Shared/SharedWeatherModels.swift')
add_source(main_target, shared_grp, NATIVE / 'Shared/WeatherOutfitLogic.swift')
add_source(main_target, shared_grp, NATIVE / 'Shared/WeatherSource.swift')

add_system_framework(project, main_target, 'WatchConnectivity')
add_system_framework(project, main_target, 'WidgetKit')

# ── Patch Info.plist ───────────────────────────────────────────────────────
info_plist_path = APP_SRC / 'Info.plist'
if info_plist_path.exist?
  content = File.read(info_plist_path)
  if content.include?('NSLocationWhenInUseUsageDescription')
    puts "  ↩  Info.plist already patched (usage strings)"
  else
    patch = <<~XML
      \t<key>NSLocationWhenInUseUsageDescription</key>
      \t<string>Layer Weather uses your location to fetch accurate local weather and generate outfit recommendations for your area.</string>
      \t<key>NSUserNotificationUsageDescription</key>
      \t<string>Layer Weather can alert you when weather changes significantly during your commute or when outdoor conditions warrant a wardrobe update.</string>
    XML
    insert_at = content.rindex('</dict>')
    abort "ERROR: could not find closing </dict> in #{info_plist_path}" unless insert_at
    content = content[0, insert_at] + patch + content[insert_at..]
    File.write(info_plist_path, content)
    puts "  +  Info.plist patched (location + notification usage strings)"
  end

  # Suppress the TestFlight encryption documentation prompt on every build.
  # The app only uses standard HTTPS/TLS (exempt encryption), so this is false.
  if content.include?('ITSAppUsesNonExemptEncryption')
    puts "  ↩  Info.plist already has ITSAppUsesNonExemptEncryption"
  else
    encryption_patch = <<~XML
      \t<key>ITSAppUsesNonExemptEncryption</key>
      \t<false/>
    XML
    insert_at = content.rindex('</dict>')
    abort "ERROR: could not find closing </dict> in #{info_plist_path}" unless insert_at
    File.write(info_plist_path, content[0, insert_at] + encryption_patch + content[insert_at..])
    puts "  +  Info.plist patched (ITSAppUsesNonExemptEncryption = false)"
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

# ── Patch Main.storyboard (Capacitor 6 custom bridge VC) ─────────────────
# This is the single most fragile step in iOS setup: if the root view
# controller is NOT LayerWeatherBridgeViewController, capacitorDidLoad() never
# runs and NONE of the local plugins register — StoreKit and widgets both die
# at runtime with "<Plugin> plugin is not implemented on ios". A silent miss
# here ships a broken build, so we match defensively (any attribute order) and
# ABORT loudly if the rewrite can't be verified.
storyboard_path = APP_SRC / 'Base.lproj/Main.storyboard'
unless storyboard_path.exist?
  abort <<~MSG
    ERROR: Main.storyboard not found at #{storyboard_path}.
    Run `npm run ios:prepare` (which runs `npx cap add/sync ios`) first.
    Without the bridge VC patch, StoreKit and widget plugins will not register
    at runtime.
  MSG
end

sb = File.read(storyboard_path)
if sb.include?('LayerWeatherBridgeViewController')
  puts "  ↩  Main.storyboard already uses LayerWeatherBridgeViewController"
elsif sb =~ /customClass="CAPBridgeViewController"/
  # Match regardless of attribute order/spacing. Capacitor's generated
  # storyboard pairs customClass="CAPBridgeViewController" with
  # customModule="Capacitor"; both must point at our app module so the bridge
  # VC's capacitorDidLoad() (which registers StoreKitPlugin + WidgetBridgePlugin)
  # actually runs.
  sb = sb.gsub(/<[^>]*\bcustomClass="CAPBridgeViewController"[^>]*>/) do |tag|
    tag.gsub('customClass="CAPBridgeViewController"', 'customClass="LayerWeatherBridgeViewController"')
       .gsub('customModule="Capacitor"', 'customModule="App"')
  end
  File.write(storyboard_path, sb)

  # Verify the rewrite took. A silent failure here is exactly the bug that has
  # repeatedly killed subscriptions in TestFlight builds.
  unless File.read(storyboard_path).include?('customClass="LayerWeatherBridgeViewController"')
    abort <<~MSG
      ERROR: failed to patch Main.storyboard root view controller.
      Open #{storyboard_path} and set the root view controller's custom class to
      LayerWeatherBridgeViewController (Module: App) manually, then re-run.
    MSG
  end
  puts "  +  Main.storyboard → LayerWeatherBridgeViewController (registers StoreKit + WidgetBridge)"
else
  abort <<~MSG
    ERROR: Main.storyboard contains neither CAPBridgeViewController nor
    LayerWeatherBridgeViewController (#{storyboard_path}).
    Capacitor's generated storyboard format may have changed. Set the root view
    controller's custom class to LayerWeatherBridgeViewController (Module: App)
    manually before archiving — otherwise StoreKit and widget plugins will not
    register at runtime.
  MSG
end

# ── AppDelegate: WatchConnectivity now starts in LayerWeatherBridgeViewController ─
delegate_path = APP_SRC / 'AppDelegate.swift'
if delegate_path.exist?
  src = File.read(delegate_path)
  if src.include?('WatchConnectivityHandler.shared.activate')
    src = src.gsub(/^\s*WatchConnectivityHandler\.shared\.activate\(\)\n/, '')
    src = src.gsub(/import WatchConnectivity\n/, '')
    File.write(delegate_path, src)
    puts "  +  AppDelegate.swift: removed WatchConnectivity (handled in bridge VC)"
  else
    puts "  ↩  AppDelegate.swift (WatchConnectivity via LayerWeatherBridgeViewController)"
  end
else
  puts "  ⚠  AppDelegate.swift not found — skipped"
end

# ══════════════════════════════════════════════════════════════════════════
# PHASE 1.5 — Verify in-app plugin wiring + add auto-registration fallback
# ══════════════════════════════════════════════════════════════════════════
# StoreKit + WidgetBridge are Swift-only CAPBridgedPlugins. They reach the JS
# layer ONLY if (a) their .swift files compile into the App target AND (b) they
# get registered at runtime. A miss in either produces the silent
# "<Plugin> plugin is not implemented on ios" error that has repeatedly broken
# subscriptions. We hard-verify (a) and add a second, bridge-VC-independent
# registration path for (b).
puts "\n── Phase 1.5: Verify in-app plugins ─────────────────────────────────"

# (a) Must be in the App target's Compile Sources or registration is impossible.
%w[
  LayerWeatherBridgeViewController.swift
  WidgetBridgePlugin.swift
  StoreKitPlugin.swift
].each do |basename|
  unless file_in_compile_phase?(main_target, basename)
    abort <<~MSG
      ERROR: #{basename} is not in the App target's Compile Sources.
      In-app purchases / widgets will fail at runtime with
      "<Plugin> plugin is not implemented on ios".
      It should have been added above — confirm native/ios/MainApp/#{basename}
      exists, then re-run. In Xcode: select the file → File Inspector →
      Target Membership → check "App".
    MSG
  end
  puts "  ✓  #{basename} in App compile sources"
end

# Confirm the bridge VC actually registers both plugins (guards against an
# accidental edit dropping a registration line).
bridge_vc_src = File.read(NATIVE / 'MainApp/LayerWeatherBridgeViewController.swift')
%w[WidgetBridgePlugin StoreKitPlugin].each do |klass|
  next if bridge_vc_src.include?("registerPluginInstance(#{klass}())")
  abort <<~MSG
    ERROR: LayerWeatherBridgeViewController.capacitorDidLoad() does not register
    #{klass}. Add inside capacitorDidLoad():
      bridge?.registerPluginInstance(#{klass}())
    otherwise it will not be available to the JS layer.
  MSG
end
puts "  ✓  bridge VC registers WidgetBridge + StoreKit"

# (b) Belt-and-suspenders: add both classes to capacitor.config.json's
#     packageClassList so Capacitor ALSO auto-registers them at bridge init via
#     NSClassFromString. The @objc(<Name>) attribute exposes the bare class name
#     to the ObjC runtime, so this works for app-local Swift plugins and makes
#     registration survive even if the Main.storyboard bridge-VC patch is ever
#     lost. Double-registration is harmless (Capacitor logs "Overriding existing
#     registered plugin"); a missing/stale class resolves to nil and is skipped.
require 'json'
cap_config = APP_SRC / 'capacitor.config.json'
if cap_config.exist?
  config = JSON.parse(File.read(cap_config))
  list = (config['packageClassList'] ||= [])
  added = %w[WidgetBridgePlugin StoreKitPlugin].reject { |c| list.include?(c) }
  if added.empty?
    puts "  ↩  capacitor.config.json packageClassList already lists local plugins"
  else
    list.concat(added)
    File.write(cap_config, JSON.pretty_generate(config))
    puts "  +  capacitor.config.json packageClassList += #{added.join(', ')}"
  end
else
  puts "  ⚠  capacitor.config.json not found at #{cap_config}"
  puts "     Run `npx cap sync ios` first — skipped auto-register fallback."
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
    <key>WKCompanionAppBundleIdentifier</key>
    <string>#{BUNDLE_ID}</string>
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

  wt = project.new_target(:app_extension, 'LayerWeatherWidgets', :ios, '17.0')
  wt.build_configurations.each do |c|
    c.build_settings.merge!(
      'PRODUCT_BUNDLE_IDENTIFIER'  => "#{BUNDLE_ID}.widgets",
      'PRODUCT_NAME'               => '$(TARGET_NAME)',
      'SWIFT_VERSION'              => '5.0',
      'IPHONEOS_DEPLOYMENT_TARGET' => '17.0',
      'INFOPLIST_FILE'             => 'App/LayerWeatherWidgets/Info.plist',
      'CODE_SIGN_STYLE'            => 'Automatic',
      'SKIP_INSTALL'               => 'YES',
    )
  end

  wg      = find_or_add_group(project.main_group, 'LayerWeatherWidgets')
  wg_sh   = find_or_add_group(wg, 'Shared')
  wg_v    = find_or_add_group(wg, 'Views')

  add_source(wt, wg_sh, NATIVE / 'Shared/AppGroupKeys.swift')
  add_source(wt, wg_sh, NATIVE / 'Shared/LastCoordinates.swift')
  add_source(wt, wg_sh, NATIVE / 'Shared/SharedWeatherModels.swift')
  add_source(wt, wg_sh, NATIVE / 'Shared/WeatherOutfitLogic.swift')
  add_source(wt, wg_sh, NATIVE / 'Shared/WeatherSource.swift')
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

  puts "  ✓  LayerWeatherWidgets target created (15 source files)"
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
  # xcodeproj leaves the product ref's `name` blank ("\.app"), which makes
  # Xcode's Autocreate Schemes skip this target. Set it explicitly.
  wwatch.product_reference.name = 'LayerWeatherWatch.app'
  wwatch.build_configurations.each do |c|
    c.build_settings.merge!(
      'PRODUCT_BUNDLE_IDENTIFIER'         => "#{BUNDLE_ID}.watchapp",
      'PRODUCT_NAME'                      => '$(TARGET_NAME)',
      'SWIFT_VERSION'                     => '5.0',
      'WATCHOS_DEPLOYMENT_TARGET'         => '10.0',
      'SDKROOT'                           => 'watchos',
      'TARGETED_DEVICE_FAMILY'            => '4',
      'INFOPLIST_FILE'                    => 'App/LayerWeatherWatch/Info.plist',
      'GENERATE_INFOPLIST_FILE'           => 'NO',
      'CODE_SIGN_STYLE'                   => 'Automatic',
      'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
      # Watch app is embedded inside the iOS host's .app/Watch/ folder. Without
      # SKIP_INSTALL=YES, Xcode also drops a standalone LayerWeatherWatch.app
      # at the products root next to App.app, leading to a "Generic Xcode
      # Archive" classification instead of "iOS App Archive".
      'SKIP_INSTALL'                      => 'YES',
    )
  end

  # Wire the watch's Assets.xcassets into Resources so the AppIcon ships.
  watch_assets_path = APP_SRC / 'LayerWeatherWatch/Assets.xcassets'
  if watch_assets_path.exist?
    wg_root = find_or_add_group(project.main_group, 'LayerWeatherWatch')
    existing_ref = wg_root.files.find { |f| File.basename(f.path.to_s) == 'Assets.xcassets' }
    asset_ref = existing_ref || wg_root.new_reference(watch_assets_path.to_s)
    asset_ref.last_known_file_type = 'folder.assetcatalog'
    unless wwatch.resources_build_phase.files.any? { |bf| bf.file_ref == asset_ref }
      wwatch.resources_build_phase.add_file_reference(asset_ref, true)
    end
    puts "  +  Assets.xcassets wired into LayerWeatherWatch Resources"
  end

  wg = find_or_add_group(project.main_group, 'LayerWeatherWatch')
  wg_sh = find_or_add_group(wg, 'Shared')
  # AppGroupKeys comes from WatchSharedModels.swift (avoid duplicate with Shared/AppGroupKeys.swift)
  add_source(wwatch, wg_sh, NATIVE / 'Shared/LastCoordinates.swift')
  add_source(wwatch, wg_sh, NATIVE / 'Shared/WeatherOutfitLogic.swift')
  add_source(wwatch, wg_sh, NATIVE / 'Shared/WeatherSource.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/LayerWeatherWatchApp.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/ContentView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/HairForecastView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/ForecastView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/OutfitView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/QuickCalibrateView.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/HapticManager.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/WatchConnectivityManager.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/WatchSharedModels.swift')
  add_source(wwatch, wg, NATIVE / 'LayerWeatherWatch/WatchWeatherService.swift')

  puts "  ✓  LayerWeatherWatch target created (13 source files)"
end

# NOTE: To make the watch app ship inside the iOS App Store upload (the
# companion-pair model — App Store Connect's "Add Platform" menu doesn't list
# watchOS for apps with WKCompanionAppBundleIdentifier), the watch app must be
# embedded into the App target's product bundle at Watch/<WatchApp.app>.
#
# Doing this through xcodeproj manually causes Xcode to misclassify the
# resulting archive as "Generic Xcode Archive" instead of "iOS App Archive".
# Set this up via Xcode's UI instead:
#   1. Select the App (iOS) target in the project navigator.
#   2. Go to General → Frameworks, Libraries, and Embedded Content.
#   3. Click + → select LayerWeatherWatch.app under Workspace.
#   4. Set Embed to "Embed & Sign".
# Xcode will generate the correct Embed Watch Content phase automatically.

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
  ct.product_reference.name = 'LayerWeatherWatchComplications.appex'
  ct.build_configurations.each do |c|
    c.build_settings.merge!(
      'PRODUCT_BUNDLE_IDENTIFIER'  => "#{BUNDLE_ID}.watchapp.complications",
      'PRODUCT_NAME'               => '$(TARGET_NAME)',
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
  add_source(ct, cg_sh, NATIVE / 'Shared/LastCoordinates.swift')
  add_source(ct, cg_sh, NATIVE / 'Shared/WeatherOutfitLogic.swift')
  add_source(ct, cg_sh, NATIVE / 'Shared/WeatherSource.swift')
  add_source(ct, cg_sh, NATIVE / 'LayerWeatherWatch/WatchSharedModels.swift')

  watch_host = project.targets.find { |t| t.name == 'LayerWeatherWatch' }
  abort "ERROR: 'LayerWeatherWatch' target not found." unless watch_host
  embed_app_extension(watch_host, ct)

  puts "  ✓  LayerWeatherWatchComplications target created (5 source files)"
end

wwatch = project.targets.find { |t| t.name == 'LayerWeatherWatch' }
ct = project.targets.find { |t| t.name == 'LayerWeatherWatchComplications' }
if wwatch && ct
  embed_app_extension(wwatch, ct)
  puts "  ✓  LayerWeatherWatchComplications embedded in LayerWeatherWatch"
end


# ══════════════════════════════════════════════════════════════════════════
# PHASE 4.5 — Ensure shared sources on EXISTING targets (idempotent)
# ══════════════════════════════════════════════════════════════════════════
# The target-creation blocks above only run the first time (they're guarded by
# `target_exists?`). Files added to native/ios/Shared after a target already
# exists would otherwise never join that target's compile phase on re-run.
# `add_source` is idempotent, so it's safe to (re)attach shared files here.
puts "\n── Phase 4.5: Ensure shared sources on existing targets ─────────────"

# Files every extension/watch target must compile. Keep in sync with the
# add_source calls in the creation blocks above. AppGroupKeys is intentionally
# excluded for watch targets (they get it from WatchSharedModels.swift).
ENSURE_SHARED = [
  NATIVE / 'Shared/WeatherSource.swift',
].freeze

%w[LayerWeatherWidgets LayerWeatherWatch LayerWeatherWatchComplications].each do |name|
  target = project.targets.find { |t| t.name == name }
  next unless target
  top = find_or_add_group(project.main_group, name)
  shared = find_or_add_group(top, 'Shared')
  ENSURE_SHARED.each { |path| add_source(target, shared, path) }
end


# ══════════════════════════════════════════════════════════════════════════
# PHASE 5 — App Group entitlements (all targets)
# ══════════════════════════════════════════════════════════════════════════
puts "\n── Phase 5: App Group entitlements ──────────────────────────────────"

attach_app_group_entitlements(main_target, 'App/App.entitlements', APP_SRC / 'App.entitlements')

%w[LayerWeatherWidgets LayerWeatherWatch LayerWeatherWatchComplications].each do |name|
  target = project.targets.find { |t| t.name == name }
  next unless target
  attach_app_group_entitlements(
    target,
    "App/#{name}/#{name}.entitlements",
    APP_SRC / name / "#{name}.entitlements"
  )
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
