# blender_poses.py — render the Slider animation at several sample times from two camera directions
import bpy
import sys
import math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
inp, outp = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=inp)

slider = next((a for a in bpy.data.actions if 'Intro' in a.name), None)
scene = bpy.context.scene

for arm in [o for o in bpy.data.objects if o.type == 'ARMATURE']:
    arm.animation_data_create()
    arm.animation_data.action = slider

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

AMOUNT = 240 / 2.0  # 2 seconds at 120fps? assume clip keys 0..48 frames over 2s -> 30fps eq? use 24 fps *2 = 48 frames
for t in (0.0, 0.75, 1.5):
    for cam_tag, direction in (('top', Vector((0.0, -0.55, -0.84))), ('iso', Vector((0.75, -0.75, 0.52)))):
        f = slider.frame_range[0] + (slider.frame_range[1] - slider.frame_range[0]) * (t / 2.0)
        scene.frame_set(int(f))
        camera.location = center + direction.normalized() * radius * 2.6
        camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = f"{outp}_{int(t * 10)}_{cam_tag}.png"
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED {outp}_{int(t * 10)}_{cam_tag}.png")

