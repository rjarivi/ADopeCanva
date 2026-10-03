# blender_poses2.py — render an animation clip at sample times: <in.glb> <out_prefix> <ClipName> <camera_dir "x,y,z">
import bpy
import sys
import math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
inp, outp, clip_name, cam_str = argv[0], argv[1], argv[2], argv[3]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=inp)

act = next((a for a in bpy.data.actions if clip_name in a.name), None)
scene = bpy.context.scene
for arm in [o for o in bpy.data.objects if o.type == 'ARMATURE']:
    arm.animation_data_create()
    arm.animation_data.action = act

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

cam_data = bpy.data.cameras.new('Cam'); cam_data.lens = 40
camera = bpy.data.objects.new('Cam', cam_data)
scene.collection.objects.link(camera)
scene.camera = camera

sun_data = bpy.data.lights.new('Sun', type='SUN'); sun_data.energy = 3.0; sun_data.angle = 0.3
sun = bpy.data.objects.new('Sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(45), 0, math.radians(45))
world = bpy.data.worlds.new('W'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = (0.8, 0.8, 0.85, 1)

scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 800
scene.render.resolution_y = 600

parts = [float(v) for v in cam_str.split(',')]
direction = Vector(parts).normalized()
for t in (0.15, 0.9, 1.8):
    f = act.frame_range[0] + (act.frame_range[1] - act.frame_range[0]) * (t / 2.0)
    scene.frame_set(int(f))
    camera.location = center + direction * radius * 2.6
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    path = f"{outp}_{int(t * 10)}.png"
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDERED", path)
