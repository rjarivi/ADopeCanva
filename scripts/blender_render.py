# blender_render.py — run: blender.exe --background --python blender_render.py -- <in.glb> <out.png> <camera>
# camera: hero | front | top
import bpy
import sys
import math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
inp, outp, cam = argv[0], argv[1], argv[2]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=inp)

scene = bpy.context.scene

# world
world = bpy.data.worlds.new('W')
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value = (0.85, 0.85, 0.88, 1.0)
bg.inputs['Strength'].default_value = 1.0

# sun
sun_data = bpy.data.lights.new('Sun', type='SUN')
sun_data.energy = 3.0
sun_data.angle = 0.3
sun = bpy.data.objects.new('Sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), math.radians(15), math.radians(35))

# bbox
mn = Vector((1e9, 1e9, 1e9))
mx = Vector((-1e9, -1e9, -1e9))
deps = bpy.context.evaluated_depsgraph_get()
for o in scene.objects:
    if o.type != 'MESH':
        continue
    oe = o.evaluated_get(deps)
    for corner in oe.bound_box:
        w = oe.matrix_world @ Vector(corner)
        mn = Vector(map(min, mn, w))
        mx = Vector(map(max, mx, w))
center = (mn + mx) / 2
radius = (mx - mn).length / 2
print(f"BBOX center={tuple(round(v,3) for v in center)} radius={round(radius,3)}")

# camera (blender is Z-up after glTF Yup import => +Z up, Y depth)
cam_data = bpy.data.cameras.new('Cam')
cam_data.lens = 60
camera = bpy.data.objects.new('Cam', cam_data)
scene.collection.objects.link(camera)
scene.camera = camera

dist = radius * 4.6
angles = {
    'hero': (math.radians(70), math.radians(25)),   # polar from +Z, azimuth
    'front': (math.radians(90), math.radians(15)),
    'back': (math.radians(90), math.radians(195)),
    'side': (math.radians(90), math.radians(90)),
    'top': (math.radians(35), math.radians(15)),
}
polar, az = angles.get(cam, angles['hero'])
direction = Vector((
    math.sin(polar) * math.sin(az),
    -math.sin(polar) * math.cos(az),
    math.cos(polar),
))
camera.location = center + direction * dist
look = (center - camera.location).to_track_quat('-Z', 'Y')
camera.rotation_euler = look.to_euler()

# render settings
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1000
scene.render.resolution_y = 750
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Filmic'
bpy.ops.render.render(write_still=True)
scene.render.filepath = outp
bpy.ops.render.render(write_still=True)
print("RENDERED", outp)


