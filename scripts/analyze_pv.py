import json
import os
import struct
import numpy as np

base = r"C:\Users\RJARI\AppData\Local\Temp\opencode\duo\pv"
doc = json.load(open(os.path.join(base, "product-viewer.gltf")))
bindata = open(os.path.join(base, "vroIlOhiWPzmavg.bin"), "rb").read()

def acc_values(idx):
    acc = doc["accessors"][idx]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    dt = {5120: "<i1", 5121: "<u1", 5122: "<i2", 5123: "<u2", 5125: "<u4", 5126: "<f4"}[acc["componentType"]]
    off = doc["bufferViews"][acc["bufferView"]].get("byteOffset", 0) + acc.get("byteOffset", 0)
    arr = np.frombuffer(bindata, dtype=dt, count=acc["count"] * n, offset=off)
    return arr.reshape(acc["count"], n)

# node tree with hierarchy (find meshes by material)
mat_names = {i: m.get("name", "?") for i, m in enumerate(doc["materials"])}
node_name = {i: n.get("name", f"node{i}") for i, n in enumerate(doc["nodes"])}

def walk(ni, depth=0):
    n = doc["nodes"][ni]
    kids = n.get("children", [])
    return (doc["nodes"][ni], ni, kids)

nodes = doc["nodes"]
mesh_screen_nodes = []
for mi, mesh in enumerate(doc["meshes"]):
    for prim in mesh["primitives"]:
        mat = mat_names.get(prim.get("material", -1), "")
        if prim.get("material") in (7, 8):
            mesh_screen_nodes.append((mi, prim["material"]))
            uv_acc = prim["attributes"].get("TEXCOORD_0")
            if uv_acc is not None:
                uv = acc_values(uv_acc)
                print(f"mesh[{mi}] name={mesh.get('name','?')} mat={mat_names[prim['material']]} "
                      f"uv0 min={np.round(uv.min(axis=0),3)} max={np.round(uv.max(axis=0),3)} verts={len(uv)}")

# which node instances use these meshes
used_meshes = {mi for mi, _ in mesh_screen_nodes}
def find_nodes(ni, depth=0):
    n = doc["nodes"][ni]
    if n.get("mesh") in used_meshes:
        print(f"  SCREEN NODE: [{ni}] {n.get('name')} parent_depth={depth} skin={'skin' in n}")
    for c in n.get("children", []):
        find_nodes(c, depth+1)
find_nodes(doc["scenes"][0]["nodes"][0])

# skin joints
skin = doc["skins"][0]
print(f"\nskin joints: {len(skin['joints'])} root={node_name[skin['skeleton']] if 'skeleton' in skin else '?'}")

# animation details
for a in doc["animations"]:
    print(f"\nanim '{a['name']}':")
    tmax = 0.0
    tmin = 1e9
    for s in a["samplers"]:
        inp_acc = doc["accessors"][s["input"]]
        # read times
        times = acc_values(s["input"]).flatten()
        tmax = max(tmax, float(times.max()))
        tmin = min(tmin, float(times.min()))
    print(f"  time range: {tmin:.3f} .. {tmax:.3f}, samplers={len(a['samplers'])}, channels={len(a['channels'])}")
    # what the slider channels target (unique node names)
    targets = set()
    for ch in a["channels"][:81]:
        n = node_name.get(ch["target"]["node"], "?")
        targets.add((n.split('.')[0], ch["target"]["path"]))
    print("  targets:", sorted(targets)[:20])

# texture formats
imgs = doc.get("images", [])
print(f"\nimages: {len(imgs)}")
from collections import Counter
print(Counter((os.path.splitext(i.get("uri",""))[1] for i in imgs)))
