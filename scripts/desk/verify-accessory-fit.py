"""Verify revised accessory relationships in the editable Blender model."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/desk/onur-desk.blend'))
bpy.context.view_layer.update()
def bounds(name):
    o=bpy.data.objects[name]
    points=[o.matrix_world @ Vector(c) for c in o.bound_box]
    return [(min(v[i] for v in points),max(v[i] for v in points)) for i in range(3)]
report={}
for name in ['MacBook power cable','MacBook display cable']:
    o=bpy.data.objects[name]
    points=[o.matrix_world @ b.co for b in o.data.splines[0].bezier_points]
    variation=max(v.z for v in points)-min(v.z for v in points)
    assert variation<1e-6 and abs(points[-1].y-.4)<1e-6
    report[name]={'heightVariationM':variation,'rearEndpointM':list(points[-1])}
clamp=bounds('Lightbar central clamp');diffuser=bounds('Lightbar diffuser')
assert clamp[1][0]>diffuser[1][1]
report['clampBehindDiffuserM']=clamp[1][0]-diffuser[1][1]
assert clamp[1][0] < bounds('Lightbar aluminium tube')[1][1]
base=bounds('Headphone stand base');dial=bounds('Lightbar wireless dial')
assert base[0][0]-dial[0][1]>.03
report['dialToStandHorizontalClearanceM']=base[0][0]-dial[0][1]
saddle=bpy.data.objects['Headphone saddle']
gaps=[]
for v in saddle.data.vertices:
    # Top paired vertices in each cross-section, before the two underside vertices.
    if v.index%4<2:
        x,y,z=v.co
        gaps.append(.140+.105*math.sqrt(1-(x/.066)**2)-z)
assert min(gaps)>0 and max(gaps)<.0003
report['saddleToInnerPaddingGapM']={'min':min(gaps),'max':max(gaps)}
# Each mesh edge is exactly on the sampled centerline of the tubular frame.
sheet=bpy.data.objects['BRYTET mesh top']
assert all(p.normal.z >= 0 for p in sheet.data.polygons)
rails=[o for o in bpy.data.objects if o.name.startswith('BRYTET rounded transverse frame')]
errors=[]
for v in sheet.data.vertices:
    errors.append(min((v.co-b.co).length for rail in rails for b in rail.data.splines[0].bezier_points))
assert max(errors)<1e-6
report['sheetToFrameCenterlineMaxErrorM']=max(errors)
def tree(o):
    evaluated=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me=evaluated.to_mesh()
    result=BVHTree.FromPolygons([o.matrix_world@v.co for v in me.vertices],[list(p.vertices) for p in me.polygons])
    evaluated.to_mesh_clear()
    return result
intersections=[]
for support in ['Headphone stand stem','Headphone saddle rear support','Headphone saddle']:
    support_tree=tree(bpy.data.objects[support])
    for o in bpy.data.objects:
        if o.type=='MESH' and ('Barracuda' in o.name or 'speaker cloth' in o.name):
            if support_tree.overlap(tree(o)):intersections.append([support,o.name])
assert not intersections,intersections
report['headphoneSupportSurfaceIntersections']=intersections
(root/'docs/qa/desk/accessory-revision-fit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
