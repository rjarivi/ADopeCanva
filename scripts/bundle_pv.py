"""Bundle product-viewer.gltf + external buffer + AVIF textures into one self-contained GLB.
Renames the two screen materials to SCREEN_1 / SCREEN_2 for runtime swapping."""
import json
import os
import struct

SRC = r"C:\Users\RJARI\AppData\Local\Temp\opencode\duo\pv"
OUT = r"F:\github apps\ADopeCanva\public\assets\models\iphone-duo-animated.glb"

doc = json.load(open(os.path.join(SRC, "product-viewer.gltf")))
bin_data = bytearray(open(os.path.join(SRC, "vroIlOhiWPzmavg.bin"), "rb").read())

RENAME = {
    "pkUBCyCvYJYVzTr": "SCREEN_1",
    "screenTextureOuterDisplay_usd_shd_lts": "SCREEN_2",
}

# drop our alternative-kept extensions that GLTFLoader can't use (optional ones)
for ext in ("EXT_materials_specular_edge_color",):
    if ext in doc.get("extensionsUsed", []):
        doc["extensionsUsed"].remove(ext)
        if not doc["extensionsUsed"]:
            del doc["extensionsUsed"]
for m in doc.get("materials", []):
    exts = m.get("extensions", {})
    for ext in ("EXT_materials_specular_edge_color",):
        if ext in exts:
            del exts[ext]

# rename screens
for m in doc.get("materials", []):
    if m.get("name") in RENAME:
        m["name"] = RENAME[m["name"]]

# embed images: append image data to the binary buffer
def pad4():
    while len(bin_data) % 4:
        bin_data.append(0)

for img in doc.get("images", []):
    uri = img["uri"]
    path = os.path.join(SRC, uri)
    with open(path, "rb") as f:
        data = f.read()
    offset = len(bin_data)
    pad = (4 - len(bin_data) % 4) % 4
    bin_data.extend(b"\x00" * pad)
    bin_data.extend(data)
    bv_index = len(doc.get("bufferViews", []))
    doc.setdefault("bufferViews", []).append({
        "buffer": 0,
        "byteOffset": offset + pad,
        "byteLength": len(data),
    })
    del img["uri"]
    img["bufferView"] = bv_index
    img["mimeType"] = "image/avif" if uri.lower().endswith(".avif") else "image/jpeg"

doc["buffers"][0]["byteLength"] = len(bin_data)
if "uri" in doc["buffers"][0]:
    del doc["buffers"][0]["uri"]

# pad to 4 before finalizing
while len(bin_data) % 4:
    bin_data.append(0)

json_data = json.dumps(doc, separators=(",", ":")).encode("utf-8")
pad_j = (4 - len(json_data) % 4) % 4
if pad_j:
    json_data += b" " * pad_j

total = 12 + 8 + len(json_data) + 8 + len(bin_data)
with open(OUT, "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, total))
    f.write(struct.pack("<I", len(json_data)))
    f.write(struct.pack("<I", 0x4E4F534A))
    f.write(json_data)
    f.write(struct.pack("<I", len(bin_data)))
    f.write(struct.pack("<I", 0x004E4942))
    f.write(bin_data)

print(f"OK {OUT} ({total/1024/1024:.2f} MB)")
print("screens:", [m["name"] for m in doc["materials"] if m.get("name", "").startswith("SCREEN")])
