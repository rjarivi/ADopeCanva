# blender_glb_validate.py — import a GLB (with skin/animation), drive the Slider action to 1.0s, render
import bpy
import sys

argv = sys.argv[sys.argv.index('--') + 1:]
inp, outp = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=inp)

objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"VALIDATE meshes={len(objs)} actions={len(bpy.data.actions)} materials={len(bpy.data.materials)}")
print("actions:", [a.name for a in bpy.data.actions])

# sample Slider action at mid by swapping the default action onto all armature/objects
slider = next((a for a in bpy.data.actions if 'Slider' in a.name), None)
intro = next((a for a in bpy.data.actions if 'Intro' in a.name), None)
scene = bpy.context.scene
if slider:
    print(f"Slider action: frame_range={slider.frame_range}")
    scene.frame_start = int(slider.frame_range[0] + (240) / 2)  # roughly half (assume 30fps -> t=1s => frame 30)
    scene.frame_current = 30
    for o in bpy.context.scene.objects:
        if o.animation_data:
            pass
    # assign slider to every armature
    for arm in [o for o in bpy.data.objects if o.type == 'ARMATURE']:
        arm.animation_data_create()
        arm.animation_data.action = slider
    scene.frame_current = int((slider.frame_range[0] + slider.frame_range[1]) / 2)

# camera
import math
from mathutils import Vector
deps = bpy.context.evaluated_depsgraph_get()
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in bpy.context.scene.objects:
    if o.type != 'MESH':
        continue
    oe = o.evaluated_get(deps)
    for c in oe.bound_box:
        w = oe.matrix_world @ Vector(c)
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2
radius = (mx - mn).length / 2
print(f"BBOX center={tuple(round(v,3) for v in center)} radius={round(radius,3)}")

cam_data = bpy.data.cameras.new('Cam'); cam_data.lens = 50
camera = bpy.data.objects.new('Cam', cam_data)
bpy.context.scene.collection.objects.link(camera)
bpy.context.scene.camera = camera
dist = radius * 3.2
d = Vector((0.55, -0.75, 0.36)).normalized()
camera.location = center + d * dist
look = (center - camera.location).to_track_quat('-Z', 'Y')
camera.rotation_euler = look.to_euler()

sun_data = bpy.data.lights.new('Sun', type='SUN'); sun_data.energy = 3.0; sun_data.angle = 0.3
sun = bpy.data.objects.new('Sun', sun_data)
bpy.context.scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(45), math.radians(10), math.radians(30))
world = bpy.data.worlds.new('W'); bpy.context.scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = (0.8, 0.8, 0.85, 1); bg.inputs['Strength'].default_value = 1

bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.context.scene.render.resolution_x = 1000
bpy.context.scene.render.resolution_y = 750
bpy.context.scene.render.filepath = outp
bpy.ops.render.render(write_still=True)
print("RENDERED", outp)
