import json
import numpy as np

base = r"C:\Users\RJARI\AppData\Local\Temp\opencode\duo\pv"
doc = json.load(open(base + r"\product-viewer.gltf"))
bindata = open(base + r"\vroIlOhiWPzmavg.bin", "rb").read()

def acc_values(idx):
    acc = doc["accessors"][idx]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    dt = {5126: "<f4", 5123: "<u2", 5125: "<u4", 5121: "<u1"}[acc["componentType"]]
    off = doc["bufferViews"][acc["bufferView"]].get("byteOffset", 0) + acc.get("byteOffset", 0)
    return np.frombuffer(bindata, dtype=dt, count=acc["count"] * n, offset=off).reshape(acc["count"], n)

def quat_to_mat(q):
    x, y, z, w = q
    return np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
        [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)],
    ])

def node_world(ni):
    n = doc["nodes"][ni]
    if "matrix" in n:
        return np.array(n["matrix"]).reshape(4, 4).T
    m = np.eye(4)
    t = n.get("translation")
    r = n.get("rotation")
    s = n.get("scale")
    if r:
        m[:3, :3] = quat_to_mat(r)
    if s:
        m[:3, :3] = np.diag(s) @ m[:3, :3]
    if t:
        m[:3, 3] = t
    return m

def find_parent(ni):
    for i, n in enumerate(doc["nodes"]):
        if "children" in n and ni in n["children"]:
            return i
    return None

def full_world(ni):
    path = [ni]
    cur = ni
    while True:
        p = find_parent(cur)
        if p is None:
            break
        path.insert(0, p)
        cur = p
    m = np.eye(4)
    for p in path:
        m = m @ node_world(p)
    return m

SCREEN_MESH = {3: 'inner', 7: 'outer'}  # mesh indices

SCREEN_MESH_TO_TAG = {3: 'inner', 7: 'outer'}
for ni, n in enumerate(doc["nodes"]):
    if "mesh" not in n:
        continue
    mesh = doc["meshes"][n["mesh"]]
    if n["mesh"] not in SCREEN_MESH_TO_TAG:
        continue
    tag = SCREEN_MESH_TO_TAG[n["mesh"]]
    mat4 = full_world(ni)
    n3 = mat4[:3, :3]
    for prim in mesh["primitives"]:
        pos = acc_values(prim["attributes"]["POSITION"])
        normals = acc_values(prim["attributes"].get("NORMAL"))
        w = (mat4[:3, :3] @ pos.T + mat4[:3, 3:4])
        mn, mx = w.min(axis=1), w.max(axis=1)
        size = mx - mn
        if normals is not None:
            wn = normals @ n3.T
            avg_normal = wn.mean(axis=0)
            avg_normal /= np.linalg.norm(avg_normal)
        else:
            avg_normal = None
        print(f"node[{ni}] {n.get('name','?')[:40]} {tag}")
        print(f"   bbox world size = {np.round(size,2)}  center = {np.round((mn+mx)/2,2)}")
        print(f"   avg world normal = {np.round(avg_normal,3) if avg_normal is not None else 'none'}")
