# blender_convert.py — run: blender.exe --background --python blender_convert.py -- <in.usda|in.usdz> <out.glb> <screenContent.png>
import bpy
import sys

argv = sys.argv[sys.argv.index('--') + 1:]
inp, outp, screen_png = argv[0], argv[1], argv[2]
SCREEN_MESHES = ('UXtsBZYlaUvHoEh', 'hhgAIoCGsHXeDPY')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=inp)

objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"IMPORTED meshes: {len(objs)}, materials: {len(bpy.data.materials)}")

# collect materials bound to the screen meshes
screen_mats = []
for o in objs:
    base = o.name.split('.')[0]
    if base in SCREEN_MESHES:
        for slot in o.material_slots:
            if slot.material and slot.material.use_nodes:
                screen_mats.append(slot.material)
screen_mats = list(dict.fromkeys(screen_mats))
print(f"screen bound materials: {[m.name for m in screen_mats]}")

wall = bpy.data.images.load(screen_png, check_existing=False)
wall.name = 'SCREEN_CONTENT'

for i, mat in enumerate(screen_mats, start=1):
    mat.name = f"SCREEN_{i}"
    principled = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    em = principled.inputs['Emission Color']
    # remove any existing emission links
    for l in list(mat.node_tree.links):
        if l.to_socket == em:
            mat.node_tree.links.remove(l)
    # create a fresh image texture node with the wallpaper
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = wall
    srgb = tex.color_ramp if False else None
    # ensure colorspace is sRGB for the wallpaper
    wall.colorspace_settings.name = 'sRGB'
    mat.node_tree.links.new(tex.outputs['Color'], em)
    principled.inputs['Emission Strength'].default_value = 1.0
    # drop old broken image datablocks unused after rewiring
    print(f"SCREEN_{i} <- {mat.name} wired to wallpaper (emission linked={em.is_linked})")

# prune unused images so the GLB stays lean
for img in list(bpy.data.images):
    if img.users == 0 and img.name != 'SCREEN_CONTENT':
        bpy.data.images.remove(img)

bpy.ops.export_scene.gltf(
    filepath=outp,
    export_format='GLB',
    export_yup=True,
    export_materials='EXPORT',
    export_image_format='AUTO',
    export_animations=False,
    export_skins=False,
    export_extras=True,
    export_cameras=False,
    export_lights=False,
)
print("EXPORTED", outp)

