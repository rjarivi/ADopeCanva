"""Flatten a chosen Pose/Color variant of the iPhone Duo USDZ into a .usda + extracted textures,
ready for Blender import. Two pose outputs: closed + landscape."""
import os
import re
import shutil
import zipfile
from collections import defaultdict

from pxr import Usd

USDZ = r"F:\github apps\ADopeCanva\public\assets\iPhone_Duo_e-sim_Star-White_Variant.usdz"
OUT_BASE = r"C:\Users\RJARI\AppData\Local\Temp\opencode\duo"
POSES = {"closed": "Closed", "landscape": "Landscape"}

z = zipfile.ZipFile(USDZ)

# index zip entries by path suffix for robust texture lookup
entries = defaultdict(list)
for n in z.namelist():
    entries[n].append(n)

for out_name, pose in POSES.items():
    stage = Usd.Stage.Open(USDZ)
    root = stage.GetPrimAtPath("/VozFyMVAwkoHjOE")
    root.GetVariantSets().GetVariantSet("Color").SetVariantSelection("Star_White")
    root.GetVariantSets().GetVariantSet("Pose").SetVariantSelection(pose)

    out_dir = os.path.join(OUT_BASE, f"duo-{out_name}")
    shutil.rmtree(out_dir, ignore_errors=True)
    os.makedirs(out_dir, exist_ok=True)

    flat = stage.Flatten()
    usda_path = os.path.join(out_dir, "iphone-duo.usda")
    flat.Export(usda_path, args={"format": "usda", "addSourceFileComment": "False"})

    # find every referenced asset path in the usda and extract from the zip
    text = open(usda_path, "r", encoding="utf-8").read()
    refs = set()
    for m in re.finditer(r"@([^@\n]+)@", text):
        p = m.group(1)
        if not p.lower().endswith((".png", ".jpg", ".jpeg", ".avif", ".ktx2", ".webp")):
            continue
        base = p.split("/")[-1]
        found = None
        for e in z.namelist():
            if e.split("/")[-1] == base and base:
                found = e
                break
        if found is None:
            print(f"  !! missing texture for {out_name}: {p}")
            continue
        # write with the SAME relative path as referenced, so Blender resolves it
        rel = p if not p.startswith("./") else p[2:]
        ref_dir = os.path.join(out_dir, os.path.dirname(rel))
        os.makedirs(ref_dir, exist_ok=True)
        with open(os.path.join(out_dir, rel.replace("/", os.sep)), "wb") as f:
            f.write(z.read(found))
        refs.add(rel)
    print(f"{out_name}: {len(refs)} textures extracted, usda exported")

    # also copy the usda-relative fallback: Blender anchors to the usda file's dir.
    # if paths were authored as 'aLgsPXnZzWMnfih/x.jpg' (without bKcENckgpBPURKD prefix),
    # ALSO copy those dirs to the out_dir root
    top_dirs = set()
    for rel in refs:
        parts = rel.split("/")
        if len(parts) >= 3:
            top_dirs.add(parts[0])
    if len(top_dirs) == 1:
        parent = f"{top_dirs.pop()}/"
        for rel in refs:
            src = os.path.join(out_dir, rel.replace("/", os.sep))
            dst = os.path.join(out_dir, rel[len(parent):].replace("/", os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(src, dst)
        print(f"{out_name}: duplicated textures without '{parent}' prefix")

print("DONE")

