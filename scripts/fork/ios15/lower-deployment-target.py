"""Lowers the generated iOS project and the pod specs of node_modules to iOS 15.1 (kongCowork local build)."""
import glob, json, os, re, sys

root = sys.argv[1]
props = os.path.join(root, "apps/mobile/ios/Podfile.properties.json")
data = json.load(open(props))
data["ios.deploymentTarget"] = "15.1"
data["EXPO_USE_PRECOMPILED_MODULES"] = "false"
json.dump(data, open(props, "w"), indent=2)
project = glob.glob(os.path.join(root, "apps/mobile/ios/*.xcodeproj/project.pbxproj"))[0]
text = open(project).read()
text, count = re.subn(r"IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;", "IPHONEOS_DEPLOYMENT_TARGET = 15.1;", text)
open(project, "w").write(text)
print("pbxproj targets:", count)
patterns = [
    re.compile(r"""(:ios\s*=>\s*['"])1[6-9](?:\.[0-9]+)*(['"])"""),
    re.compile(r"""(\.ios\.deployment_target\s*=\s*['"])1[6-9](?:\.[0-9]+)*(['"])"""),
]
changed = 0
for directory, _, files in (entry for base in ("node_modules", "apps/mobile/modules") for entry in os.walk(os.path.join(root, base))):
    for name in files:
        if not name.endswith(".podspec"):
            continue
        path = os.path.join(directory, name)
        original = open(path, errors="ignore").read()
        updated = original
        for pattern in patterns:
            updated = pattern.sub(r"\g<1>15.1\g<2>", updated)
        if updated != original:
            open(path, "w").write(updated)
            changed += 1
print("podspecs lowered:", changed)
