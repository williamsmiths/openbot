"""Makes expo-modules-core compile for iOS 15.1 (kongCowork local build). Idempotent."""
import os, re, sys

core = os.path.join(sys.argv[1], "node_modules/expo-modules-core/ios")

color = os.path.join(core, "Core/Convertibles/Convertibles+Color.swift")
text = open(color).read()
if "enum CSSColorFunctions" not in text:
    start = text.index("// MARK: - CSS Color Function Regex Patterns")
    end = text.index("private let namedColors")
    region = text[start:end]
    region = region.replace("nonisolated(unsafe) private let ", "nonisolated(unsafe) static let ")
    region = re.sub(r"^private func ", "static func ", region, flags=re.M)
    region = "// kongCowork: RegexBuilder needs iOS 16; iOS 15 reads hex and named colors only.\n@available(iOS 16.0, *)\nprivate enum CSSColorFunctions {\n" + region.rstrip() + "\n}\n\n"
    text = text[:start] + region + text[end:]
    for name in ("RGB", "HSL", "HWB"):
        call = f"    return try colorFromRGBString(lowercased)\n".replace("RGB", name)
        fixed = (f"    if #available(iOS 16.0, *) {{\n      return try CSSColorFunctions.colorFrom{name}String(lowercased)\n    }}\n"
                 f"    throw InvalidHexColorException(input)\n")
        assert call in text, name
        text = text.replace(call, fixed, 1)
    open(color, "w").write(text)
    print("color patched")

scene = os.path.join(core, "Utilities/SceneGeometry.swift")
text = open(scene).read()
old = "    return windowScene(for: view)?.effectiveGeometry.interfaceOrientation ?? .unknown\n"
new = ("    if #available(iOS 16.0, *) {\n      return windowScene(for: view)?.effectiveGeometry.interfaceOrientation ?? .unknown\n    }\n"
       "    return windowScene(for: view)?.interfaceOrientation ?? .unknown\n")
head = "  static func interfaceOrientation(for view: UIView? = nil) -> UIInterfaceOrientation {\n"
start = text.index(head) + len(head)
end = text.index("\n  }\n", start) + 1
if text[start:end] != new:
    # Also repairs nested copies left by earlier non-idempotent runs.
    open(scene, "w").write(text[:start] + new + text[end:])
    print("scene patched")

localization = os.path.join(sys.argv[1], "node_modules/expo-localization/ios/LocalizationModule.swift")
text = open(localization).read()
old = ("    let hourCycle = locale.hourCycle\n"
       "    return hourCycle == .zeroToTwentyThree || hourCycle == .oneToTwentyFour\n")
new = ("    if #available(iOS 16, *) {\n"
       "      let hourCycle = locale.hourCycle\n"
       "      return hourCycle == .zeroToTwentyThree || hourCycle == .oneToTwentyFour\n"
       "    }\n"
       "    // iOS 15: a 12-hour clock has an AM/PM marker (`a`) in the preferred hour format.\n"
       "    let format = DateFormatter.dateFormat(fromTemplate: \"j\", options: 0, locale: locale) ?? \"\"\n"
       "    return !format.contains(\"a\")\n")
if old in text:
    open(localization, "w").write(text.replace(old, new, 1))
    print("localization patched")

video = os.path.join(sys.argv[1], "node_modules/expo-video/ios/OrientationAVPlayerViewController.swift")
text = open(video).read()
old = "    windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: fullscreenOrientation))\n"
new = ("    if #available(iOS 16.0, *) {\n"
       "      windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: fullscreenOrientation))\n"
       "    } else {\n"
       "      UIViewController.attemptRotationToDeviceOrientation()\n"
       "    }\n")
if new not in text and old in text:
    open(video, "w").write(text.replace(old, new, 1))
    print("video patched")


# ---- Round 2: expo-application, expo-camera, expo-dev-launcher, expo-media-library, @expo/ui ----
root = sys.argv[1]


def patch(rel, old, new, label):
    """Replace `old` with `new` once. Skip when `new` is already there. Fail loudly when neither is."""
    path = os.path.join(root, "node_modules", rel)
    text = open(path).read()
    if new in text:
        pass
    elif old in text:
        open(path, "w").write(text.replace(old, new, 1))
        print("patched:", label)
    else:
        raise SystemExit(f"NOT FOUND: {label} in {rel}")


patch("expo-application/ios/ApplicationModule.swift",
      "  func getStoreEnvironmentAsync() async -> String? {\n    guard case",
      "  func getStoreEnvironmentAsync() async -> String? {\n"
      "    // kongCowork: AppTransaction needs iOS 16; iOS 15 has no store environment.\n"
      "    guard #available(iOS 16.0, *) else {\n      return nil\n    }\n    guard case",
      "application AppTransaction guard")
patch("expo-application/ios/ApplicationModule.swift",
      "  static func storeEnvironment(_ environment: AppStore.Environment)",
      "  @available(iOS 16.0, *)\n  static func storeEnvironment(_ environment: AppStore.Environment)",
      "application storeEnvironment availability")

patch("expo-camera/ios/Current/BarcodeScannerUtils.swift",
      "    let validTypes = [\n",
      "    var validTypes = [\n",
      "camera validTypes var")
patch("expo-camera/ios/Current/BarcodeScannerUtils.swift",
      '      "datamatrix": AVMetadataObject.ObjectType.dataMatrix,\n      "codabar": AVMetadataObject.ObjectType.codabar\n    ]\n',
      '      "datamatrix": AVMetadataObject.ObjectType.dataMatrix\n    ]\n'
      '    // kongCowork: codabar needs iOS 15.4.\n'
      '    if #available(iOS 15.4, *) {\n      validTypes["codabar"] = AVMetadataObject.ObjectType.codabar\n    }\n',
      "camera codabar")

patch("expo-dev-launcher/ios/SwiftUI/DevServerInfoModal.swift",
      "    #if os(iOS)\n    .presentationDetents([.medium])\n    #endif\n  }\n",
      "    #if os(iOS)\n    .modifier(KCMediumDetentModifier())\n    #endif\n  }\n",
      "dev-launcher presentationDetents call")
patch("expo-dev-launcher/ios/SwiftUI/DevServerInfoModal.swift",
      "struct DevServerInfoModal: View {\n",
      "// kongCowork: presentationDetents needs iOS 16; iOS 15 shows a full-height sheet.\n"
      "private struct KCMediumDetentModifier: ViewModifier {\n"
      "  func body(content: Content) -> some View {\n"
      "    if #available(iOS 16.0, *) {\n      content.presentationDetents([.medium])\n    } else {\n      content\n    }\n"
      "  }\n}\n\n"
      "struct DevServerInfoModal: View {\n",
      "dev-launcher KCMediumDetentModifier")

patch("expo-media-library/ios/next/objects/asset/MediaSubtype.swift",
      "    case .spatialMedia: .spatialMedia\n",
      "    // kongCowork: .spatialMedia needs iOS 16; it is PHAssetMediaSubtypeSpatialMedia (1 << 10), never set on iOS 15.\n"
      "    case .spatialMedia: PHAssetMediaSubtype(rawValue: 1 << 10)\n",
      "media-library spatialMedia")

UI = "@expo/ui/ios/"

patch(UI + "BottomSheetView.swift",
      '    if let background = props.children?.slot("presentationBackground") {\n'
      "      sheetContent.presentationBackground { background }\n    } else {\n      sheetContent\n    }\n",
      "    // kongCowork: presentationBackground needs iOS 16.4; older systems keep the default background.\n"
      "    if #available(iOS 16.4, tvOS 16.4, *) {\n"
      '      if let background = props.children?.slot("presentationBackground") {\n'
      "        sheetContent.presentationBackground { background }\n      } else {\n        sheetContent\n      }\n"
      "    } else {\n      sheetContent\n    }\n",
      "ui BottomSheet presentationBackground")

patch(UI + "Convertibles/ScrollIndicatorVisibilityOptions.swift",
      "  func toVisibility() -> ScrollIndicatorVisibility {",
      "  @available(iOS 16.0, tvOS 16.0, *)\n  func toVisibility() -> ScrollIndicatorVisibility {",
      "ui ScrollIndicatorVisibility availability")
patch(UI + "Modifiers/ScrollIndicatorsModifier.swift",
      "    content.scrollIndicators(visibility.toVisibility(), axes: axes.toAxis())\n",
      "    // kongCowork: scrollIndicators needs iOS 16; iOS 15 keeps the default indicators.\n"
      "    if #available(iOS 16.0, tvOS 16.0, *) {\n"
      "      content.scrollIndicators(visibility.toVisibility(), axes: axes.toAxis())\n"
      "    } else {\n      content\n    }\n",
      "ui ScrollIndicatorsModifier")

patch(UI + "Convertibles/ToolbarItemPlacementOptions.swift",
      "#else\n      return .secondaryAction\n#endif\n",
      "#else\n      // kongCowork: secondaryAction needs iOS 16.\n"
      "      if #available(iOS 16.0, *) {\n        return .secondaryAction\n      }\n      return .automatic\n#endif\n",
      "ui ToolbarItemPlacement secondaryAction")

patch(UI + "DatePickerView.swift",
      "  func sizeThatFits(_ proposal: ProposedViewSize, uiView: UIDatePicker",
      "  // kongCowork: ProposedViewSize needs iOS 16; iOS 15 uses the intrinsic size.\n"
      "  @available(iOS 16.0, tvOS 16.0, *)\n"
      "  func sizeThatFits(_ proposal: ProposedViewSize, uiView: UIDatePicker",
      "ui DatePicker sizeThatFits")

# onGeometryChange (iOS 16): one shared helper with a GeometryReader fallback, as HostView.swift does.
patch(UI + "Modifiers/OnGeometryChangeModifier.swift",
      "    content.onGeometryChange(for: CGRect.self,",
      "    content.kcOnGeometryChange(for: CGRect.self,",
      "ui OnGeometryChangeModifier call")
geometry_helper = '''
// kongCowork: onGeometryChange needs iOS 16; iOS 15 reads the value with a background GeometryReader.
internal extension View {
  @ViewBuilder
  func kcOnGeometryChange<T: Equatable>(
    for type: T.Type,
    of transform: @escaping (GeometryProxy) -> T,
    action: @escaping (T) -> Void
  ) -> some View {
    if #available(iOS 16.0, tvOS 16.0, macOS 13.0, *) {
      self.onGeometryChange(for: type, of: transform, action: action)
    } else {
      self.background(
        GeometryReader { proxy in
          Color.clear
            .onAppear { action(transform(proxy)) }
            .onChange(of: transform(proxy)) { action($0) }
        }
      )
    }
  }
}
'''
path = os.path.join(root, "node_modules", UI + "Modifiers/OnGeometryChangeModifier.swift")
text = open(path).read()
if "func kcOnGeometryChange" not in text:
    open(path, "w").write(text.rstrip("\n") + "\n" + geometry_helper)
    print("patched: ui kcOnGeometryChange helper")

patch(UI + "DataListForEachView.swift", "Color.clear.onGeometryChange(", "Color.clear.kcOnGeometryChange(",
      "ui DataListForEach geometry")
patch(UI + "LazyHStackView.swift", "    .onGeometryChange(for: CGFloat.self", "    .kcOnGeometryChange(for: CGFloat.self",
      "ui LazyHStack geometry")
patch(UI + "LazyVStackView.swift", "    .onGeometryChange(for: CGFloat.self", "    .kcOnGeometryChange(for: CGFloat.self",
      "ui LazyVStack geometry")
patch(UI + "ListView.swift", "      .onGeometryChange(for: CGFloat.self", "      .kcOnGeometryChange(for: CGFloat.self",
      "ui List geometry")
patch(UI + "RNHostView.swift", "        .onGeometryChange(for: CGPoint?.self) {", "        .kcOnGeometryChange(for: CGPoint?.self) {",
      "ui RNHostView geometry")

patch(UI + "Modifiers/MenuOrderModifier.swift",
      "  func toNativeMenuOrder() -> SwiftUI.MenuOrder {",
      "  @available(iOS 16.0, tvOS 17.0, *)\n  func toNativeMenuOrder() -> SwiftUI.MenuOrder {",
      "ui MenuOrder availability")
patch(UI + "Modifiers/MenuOrderModifier.swift",
      "    content.menuOrder(order.toNativeMenuOrder())\n",
      "    // kongCowork: menuOrder needs iOS 16; iOS 15 keeps the system order.\n"
      "    if #available(iOS 16.0, tvOS 17.0, *) {\n      content.menuOrder(order.toNativeMenuOrder())\n    } else {\n      content\n    }\n",
      "ui MenuOrderModifier body")

patch(UI + "Modifiers/NavigationModifiers.swift",
      "    switch style {\n    case .automatic:\n      content.navigationSplitViewStyle(.automatic)\n"
      "    case .balanced:\n      content.navigationSplitViewStyle(.balanced)\n"
      "    case .prominentDetail:\n      content.navigationSplitViewStyle(.prominentDetail)\n    }\n",
      "    // kongCowork: NavigationSplitView styles need iOS 16.\n"
      "    if #available(iOS 16.0, tvOS 16.0, *) {\n"
      "      switch style {\n      case .automatic:\n        content.navigationSplitViewStyle(.automatic)\n"
      "      case .balanced:\n        content.navigationSplitViewStyle(.balanced)\n"
      "      case .prominentDetail:\n        content.navigationSplitViewStyle(.prominentDetail)\n      }\n"
      "    } else {\n      content\n    }\n",
      "ui navigationSplitViewStyle")
patch(UI + "Modifiers/NavigationModifiers.swift",
      "    if let width {\n      content.navigationSplitViewColumnWidth(width)\n"
      "    } else if let ideal {\n      content.navigationSplitViewColumnWidth(min: min, ideal: ideal, max: max)\n"
      "    } else {\n      content\n    }\n",
      "    // kongCowork: column widths need iOS 16.\n"
      "    if #available(iOS 16.0, tvOS 16.0, *) {\n"
      "      if let width {\n        content.navigationSplitViewColumnWidth(width)\n"
      "      } else if let ideal {\n        content.navigationSplitViewColumnWidth(min: min, ideal: ideal, max: max)\n"
      "      } else {\n        content\n      }\n"
      "    } else {\n      content\n    }\n",
      "ui navigationSplitViewColumnWidth")

patch(UI + "Modifiers/PresentationModifiers.swift",
      "    content.presentationCornerRadius(cornerRadius.map { CGFloat($0) })\n",
      "    // kongCowork: presentationCornerRadius needs iOS 16.4.\n"
      "    if #available(iOS 16.4, tvOS 16.4, *) {\n"
      "      content.presentationCornerRadius(cornerRadius.map { CGFloat($0) })\n    } else {\n      content\n    }\n",
      "ui presentationCornerRadius")
patch(UI + "Modifiers/PresentationModifiers.swift",
      "    if let shapeStyle = style?.toAnyShapeStyle() {\n      content.presentationBackground(shapeStyle)\n"
      "    } else {\n      content\n    }\n",
      "    // kongCowork: presentationBackground needs iOS 16.4.\n"
      "    if #available(iOS 16.4, tvOS 16.4, *) {\n"
      "      if let shapeStyle = style?.toAnyShapeStyle() {\n        content.presentationBackground(shapeStyle)\n"
      "      } else {\n        content\n      }\n"
      "    } else {\n      content\n    }\n",
      "ui presentationBackground modifier")

patch(UI + "Modifiers/ViewModifierRegistry.swift",
      "    if let shapeStyle = tint?.toAnyShapeStyle() {\n      content.tint(shapeStyle)\n    } else {\n      content\n    }\n",
      "    // kongCowork: tint(ShapeStyle) needs iOS 16; iOS 15 applies a plain color tint only.\n"
      "    if #available(iOS 16.0, tvOS 16.0, *) {\n"
      "      if let shapeStyle = tint?.toAnyShapeStyle() {\n        content.tint(shapeStyle)\n      } else {\n        content\n      }\n"
      "    } else if let color = tint?.color {\n      content.tint(color)\n    } else {\n      content\n    }\n",
      "ui TintModifier")
for side in ("Leading", "Trailing"):
    patch(UI + "Modifiers/ViewModifierRegistry.swift",
          f"#else\n      return .listRowSeparator{side}\n#endif\n",
          f"#else\n      // kongCowork: list row separator guides need iOS 16.\n"
          f"      if #available(iOS 16.0, *) {{\n        return .listRowSeparator{side}\n      }}\n      return nil\n#endif\n",
          f"ui listRowSeparator{side}")

patch(UI + "NavigationLinkView.swift",
      "    NavigationLink(value: props.value) {\n      Children()\n    }\n",
      "    // kongCowork: value-based links need iOS 16; iOS 15 shows the label without navigation.\n"
      "    if #available(iOS 16.0, tvOS 16.0, *) {\n"
      "      NavigationLink(value: props.value) {\n        Children()\n      }\n"
      "    } else {\n      Children()\n    }\n",
      "ui NavigationLink")

patch(UI + "NavigationStackView.swift",
      "  var body: some View {\n    NavigationStack(path: pathBinding) {\n      rootContent\n"
      "        .navigationDestination(for: String.self) { value in\n"
      "          NavigationDestinationContent(props: props, value: value)\n        }\n    }\n  }\n",
      "  // kongCowork: NavigationStack needs iOS 16; iOS 15 shows the root in a NavigationView without path pushes.\n"
      "  @ViewBuilder\n"
      "  var body: some View {\n    if #available(iOS 16.0, tvOS 16.0, *) {\n"
      "      NavigationStack(path: pathBinding) {\n        rootContent\n"
      "          .navigationDestination(for: String.self) { value in\n"
      "            NavigationDestinationContent(props: props, value: value)\n          }\n      }\n"
      "    } else {\n      NavigationView {\n        rootContent\n      }\n      .navigationViewStyle(.stack)\n    }\n  }\n",
      "ui NavigationStack")

NSV = UI + "NavigationSplitViewView.swift"
patch(NSV, "  func toVisibility() -> NavigationSplitViewVisibility {",
      "  @available(iOS 16.0, tvOS 16.0, *)\n  func toVisibility() -> NavigationSplitViewVisibility {",
      "ui SplitView toVisibility")
patch(NSV, "  static func from(_ visibility: NavigationSplitViewVisibility)",
      "  @available(iOS 16.0, tvOS 16.0, *)\n  static func from(_ visibility: NavigationSplitViewVisibility)",
      "ui SplitView from")
patch(NSV, "  private var columnVisibilityBinding: Binding<NavigationSplitViewVisibility> {",
      "  @available(iOS 16.0, tvOS 16.0, *)\n  private var columnVisibilityBinding: Binding<NavigationSplitViewVisibility> {",
      "ui SplitView binding")
patch(NSV,
      "    } else {\n      if let contentColumn {\n        NavigationSplitView(columnVisibility: columnVisibilityBinding) {\n"
      "          sidebarColumn\n        } content: {\n          contentColumn\n        } detail: {\n          detailColumn\n        }\n"
      "      } else {\n        NavigationSplitView(columnVisibility: columnVisibilityBinding) {\n"
      "          sidebarColumn\n        } detail: {\n          detailColumn\n        }\n      }\n    }\n",
      "    } else if #available(iOS 16.0, tvOS 16.0, *) {\n      if let contentColumn {\n"
      "        NavigationSplitView(columnVisibility: columnVisibilityBinding) {\n"
      "          sidebarColumn\n        } content: {\n          contentColumn\n        } detail: {\n          detailColumn\n        }\n"
      "      } else {\n        NavigationSplitView(columnVisibility: columnVisibilityBinding) {\n"
      "          sidebarColumn\n        } detail: {\n          detailColumn\n        }\n      }\n"
      "    } else {\n      // kongCowork: NavigationSplitView needs iOS 16; iOS 15 uses NavigationView columns.\n"
      "      NavigationView {\n        sidebarColumn\n        if let contentColumn {\n          contentColumn\n        }\n"
      "        detailColumn\n      }\n    }\n",
      "ui NavigationSplitView fallback")


# ---- Round 3: expo-widgets (ActivityKit needs iOS 16.1/16.2, AppIntents iOS 16) ----
W = "expo-widgets/ios/"
NOT_SUPPORTED = "    // kongCowork: Live Activities need iOS 16.2.\n"

patch(W + "LiveActivityFactory.swift",
      "    guard ActivityAuthorizationInfo().areActivitiesEnabled else {\n",
      NOT_SUPPORTED + "    guard #available(iOS 16.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else {\n",
      "widgets factory start")
patch(W + "LiveActivityFactory.swift",
      "  func getInstances() throws -> [LiveActivity] {\n",
      "  func getInstances() throws -> [LiveActivity] {\n" + NOT_SUPPORTED
      + "    guard #available(iOS 16.2, *) else {\n      return []\n    }\n",
      "widgets factory getInstances")
for sig, label in (("  func update(props: String?, staleDate: Date?) async throws {\n", "update"),
                   ("  func end(dismissalPolicy: LiveActivityDismissalPolicy?, afterDate: Date?, props: String?, contentDate: Date?) async throws {\n", "end"),
                   ("  func getPushToken() throws -> String? {\n", "getPushToken")):
    patch(W + "LiveActivity.swift", sig,
          sig + NOT_SUPPORTED + "    guard #available(iOS 16.2, *) else {\n      throw LiveActivityNotFoundException(id)\n    }\n",
          "widgets LiveActivity " + label)
patch(W + "LiveActivity.swift",
      "  func observePushTokenUpdates(for activity:",
      "  @available(iOS 16.2, *)\n  func observePushTokenUpdates(for activity:",
      "widgets LiveActivity observePushTokenUpdates")
patch(W + "WidgetsRecords.swift",
      "  internal func toDismissalPolicy(date: Date?) -> ActivityUIDismissalPolicy {",
      "  @available(iOS 16.2, *)\n  internal func toDismissalPolicy(date: Date?) -> ActivityUIDismissalPolicy {",
      "widgets toDismissalPolicy")

for name in ("WidgetReload: AppIntent", "WidgetUserInteraction: AppIntent"):
    patch(W + "Widgets/AppIntent.swift", f"\nstruct {name} {{", f"\n@available(iOS 16.0, *)\nstruct {name} {{",
          "widgets intent " + name.split(":")[0])
patch(W + "Widgets/AppIntent.swift", "\nstruct LiveActivityUserInteraction: LiveActivityIntent {",
      "\n@available(iOS 16.2, *)\nstruct LiveActivityUserInteraction: LiveActivityIntent {",
      "widgets intent LiveActivityUserInteraction")

patch(W + "Widgets/Utils.swift",
      '    "colorScheme": "\\(environment.colorScheme)",\n'
      '    "isLuminanceReduced": environment.isLuminanceReduced,\n'
      '    "widgetRenderingMode": environment.widgetRenderingMode.description,\n'
      '    "showsWidgetLabel": environment.showsWidgetLabel\n  ]\n',
      '    "colorScheme": "\\(environment.colorScheme)"\n  ]\n'
      "  // kongCowork: these environment values need iOS 16.\n"
      "  if #available(iOS 16.0, *) {\n"
      '    env["isLuminanceReduced"] = environment.isLuminanceReduced\n'
      '    env["widgetRenderingMode"] = environment.widgetRenderingMode.description\n'
      '    env["showsWidgetLabel"] = environment.showsWidgetLabel\n  }\n',
      "widgets getWidgetEnvironment")
patch(W + "Widgets/Utils.swift",
      "\nfunc getLiveActivityEnvironment(",
      "\n@available(iOS 16.2, *)\nfunc getLiveActivityEnvironment(",
      "widgets getLiveActivityEnvironment")

for decl in ("public struct WidgetLiveActivity: Widget {", "private struct LiveActivitySectionView: View {",
             "private struct LiveActivityBannerView: View {"):
    patch(W + "Widgets/WidgetLiveActivity.swift", "\n" + decl,
          "\n// kongCowork: Live Activity UI needs iOS 16.2.\n@available(iOS 16.2, *)\n" + decl,
          "widgets " + decl.split()[2].rstrip(":"))

patch(W + "Widgets/WidgetModifiers.swift",
      "#if !os(tvOS) && !os(macOS) && !targetEnvironment(macCatalyst)\n    content.activityBackgroundTint(color)\n#else\n",
      "#if !os(tvOS) && !os(macOS) && !targetEnvironment(macCatalyst)\n"
      "    // kongCowork: activityBackgroundTint needs iOS 16.\n"
      "    if #available(iOS 16.0, *) {\n      content.activityBackgroundTint(color)\n    } else {\n      content\n    }\n#else\n",
      "widgets activityBackgroundTint")


# ---- Round 4: ExpoModulesJSI.xcframework is built by SwiftPM with the Package.swift platform (16.4). ----
# Package.swift is in the build script's source hash, so this change makes the next build rebuild the slice.
patch("expo-modules-jsi/apple/Package.swift",
      '    .iOS("16.4"),\n',
      '    .iOS("15.1"), // kongCowork: was 16.4; the app runs on iOS 15.\n',
      "jsi Package.swift iOS 15.1")


# ---- Round 5: ExpoModulesJSI sources at iOS 15.1 ----
JSI = "expo-modules-jsi/apple/"
# Swift marks C++ foreign reference types (IRuntime, Runtime, RuntimeScheduler, HostFunctionClosure)
# as iOS 16.4+, the Swift 5.8 runtime. All other iOS 16 APIs are replaced below, so the check is off
# only for that reason. IRGen still weak-links by the 15.1 deployment target.
patch(JSI + "Package.swift",
      '          "-Xfrontend",\n          "-clang-header-expose-decls=has-expose-attr",\n',
      '          "-Xfrontend",\n          "-clang-header-expose-decls=has-expose-attr",\n'
      '          // kongCowork: C++ foreign reference types are marked iOS 16.4+; build for iOS 15.1 anyway.\n'
      '          "-Xfrontend", "-disable-availability-checking",\n',
      "jsi disable-availability-checking")

kc_lock = '''
// kongCowork: OSAllocatedUnfairLock needs iOS 16. Same `withLock` contract on an os_unfair_lock.
internal final class KCUnfairLock<State>: @unchecked Sendable {
  private let lock: UnsafeMutablePointer<os_unfair_lock>
  private var state: State

  internal init(initialState: State) {
    lock = UnsafeMutablePointer<os_unfair_lock>.allocate(capacity: 1)
    lock.initialize(to: os_unfair_lock())
    state = initialState
  }

  deinit {
    lock.deinitialize(count: 1)
    lock.deallocate()
  }

  internal func withLock<R>(_ body: (inout State) throws -> R) rethrows -> R {
    os_unfair_lock_lock(lock)
    defer { os_unfair_lock_unlock(lock) }
    return try body(&state)
  }
}
'''
patch(JSI + "Sources/ExpoModulesJSI/Runtime/JavaScriptRuntimeCache.swift",
      "private let nextCacheKeyIndex = OSAllocatedUnfairLock(initialState: 0)\n",
      "private let nextCacheKeyIndex = KCUnfairLock(initialState: 0)\n" + kc_lock,
      "jsi cache lock")
patch(JSI + "Sources/ExpoModulesJSI/Runtime/JavaScriptRuntimeScheduler.swift",
      "  private let isWoken = OSAllocatedUnfairLock(initialState: false)\n",
      "  private let isWoken = KCUnfairLock(initialState: false)\n",
      "jsi scheduler lock")

kc_ident = '''
// kongCowork: Regex needs iOS 16. Same check as /^[a-zA-Z_$][a-zA-Z0-9_$]*$/ with `wholeMatch`.
private func kcIsJavaScriptIdentifier(_ name: String) -> Bool {
  guard !name.isEmpty else {
    return false
  }
  for (index, scalar) in name.unicodeScalars.enumerated() {
    switch scalar {
    case "a"..."z", "A"..."Z", "_", "$":
      continue
    case "0"..."9" where index > 0:
      continue
    default:
      return false
    }
  }
  return true
}
'''
rt = JSI + "Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift"
patch(rt, "    if name.wholeMatch(of: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/) == nil {\n",
      "    if !kcIsJavaScriptIdentifier(name) {\n", "jsi identifier check call")
path = os.path.join(root, "node_modules", rt)
text = open(path).read()
if "func kcIsJavaScriptIdentifier" not in text:
    open(path, "w").write(text.rstrip("\n") + "\n" + kc_ident)
    print("patched: jsi identifier helper")

# ExpoModulesJSI is built with -disable-availability-checking, so `#available(iOS 26)` is assumed true
# and `Task.immediate` (iOS 26) is called on iOS 15: EXC_BAD_ACCESS at 0x0 on the JS thread at
# startup. Always take the old-OS path, without `name:` (also iOS 26).
patch("expo-modules-jsi/apple/Sources/ExpoModulesJSI/Extensions/Task+immediate.swift",
      "    if #available(macOS 26.0, iOS 26.0, watchOS 26.0, tvOS 26.0, *) {\n"
      "      return Task.immediate(name: name, priority: priority, operation: operation)\n"
      "    } else {\n"
      "      // In the polyfill always use the highest priority and hope it executes earlier.\n"
      "      return Task(name: name, priority: .high, operation: operation)\n"
      "    }\n",
      "    // kongCowork iOS 15 build: the availability check is compiled out here, so never call the\n"
      "    // iOS 26 Task.immediate or Task(name:) on this runtime.\n"
      "    return Task(priority: .high, operation: operation)\n",
      "jsi Task.immediate polyfill")
