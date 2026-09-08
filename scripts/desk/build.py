"""Reproducible desk model. Blender 4.5 LTS, no third-party assets.
Run: Blender --background --python scripts/desk/build.py [-- --render]
Coordinates: metres, Z up, front of desk is -Y. GLB export converts to Y up.
"""
import bpy
import math
import json
import sys
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/desk'
PUBLIC = ROOT / 'public/models/desk'
POSTERS = ROOT / 'docs/qa/desk/blender'
for directory in (OUT, PUBLIC, POSTERS):
    directory.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in (bpy.data.materials, bpy.data.images, bpy.data.curves, bpy.data.meshes):
    for item in list(collection):
        if item.users == 0:
            collection.remove(item)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1

# Authored reusable textures: no reference photograph or screen contents are embedded.
def pattern(name, size, pixel):
    img = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = []
    for y in range(size):
        for x in range(size):
            pixels.extend(pixel(x, y, size))
    img.pixels = pixels
    img.pack()
    return img

mesh_img = pattern('Authored expanded metal', 128, lambda x,y,s:
    (0.055,0.060,0.064,1) if min((x+y)%32,(x-y)%32)<4 else (0.022,0.025,0.028,0))
fabric_img = pattern('Authored woven fabric', 128, lambda x,y,s:
    (0.045+(x%3==0)*.008,0.047+(y%3==0)*.008,0.051,1))
perforation_img = pattern('Authored speaker perforation', 128, lambda x,y,s:
    (.04,.045,.05,1) if (x%8-4)**2+(y%8-4)**2<5 else (.40,.42,.44,1))

def material(name, color, rough=.5, metal=0, emission=None, texture=None, alpha=False):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1)
        p.inputs['Emission Strength'].default_value=emission
    if texture:
        t=m.node_tree.nodes.new('ShaderNodeTexImage'); t.image=texture
        m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
        if alpha:
            m.node_tree.links.new(t.outputs['Alpha'],p.inputs['Alpha'])
            m.surface_render_method='DITHERED'
    return m

M={
 'desk':material('Warm white laminate',(.72,.73,.72),.62),
 'black':material('Graphite polymer',(.014,.018,.023),.53),
 'edge':material('Satin black metal',(.028,.033,.04),.42,.6),
 'silver':material('Space grey aluminium',(.30,.32,.35),.36,.78),
 'darkmetal':material('Anodised aluminium',(.095,.11,.13),.32,.7),
 'rubber':material('Soft touch rubber',(.018,.022,.026),.86),
 'fabric':material('Woven black textile',(.12,.13,.14),.94,texture=fabric_img),
 'mesh':material('Expanded steel mesh',(.05,.05,.05),.46,.65,texture=mesh_img,alpha=True),
 'speaker':material('Perforated aluminium',(.4,.4,.4),.55,.5,texture=perforation_img),
 'keys':material('Keycap graphite',(.035,.04,.049),.65),
 'legend':material('Key legends',(.55,.59,.64),.7),
 'glass':material('Inactive screen glass',(.008,.018,.034),.24,.08,emission=.3),
 'warm':material('Warm diffuser',(.95,.72,.40),.4,emission=2),
 'pink':material('Rose opal diffuser',(.72,.30,.38),.35,emission=.65),
 'white':material('Soft white indicator',(.75,.84,1),.4,emission=2),
 'wall':material('Warm plaster',(.19,.17,.15),.95),
}

# Small authored tangent-space normals survive glTF export. These describe
# material grain, not large dents; fixed seeds keep every build reproducible.
def micro_normal(name, strength, woven=False):
    size=256
    yy,xx=np.mgrid[0:size,0:size]
    rng=np.random.default_rng(42)
    height=rng.random((size,size))*.20
    if woven: height += .35*np.sin(xx*math.pi/2)*np.cos(yy*math.pi/2)
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))*strength
    dy=(np.roll(height,-1,0)-np.roll(height,1,0))*strength
    normals=np.stack((-dx,-dy,np.ones_like(dx)),axis=-1)
    normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
    pixels=np.concatenate((normals*.5+.5,np.ones((size,size,1))),axis=-1).astype(np.float32)
    img=bpy.data.images.new(name,width=size,height=size,alpha=False)
    img.colorspace_settings.name='Non-Color'
    img.pixels.foreach_set(pixels.ravel());img.pack()
    return img
for key,strength,woven in [('fabric',.65,True),('rubber',.20,False),('silver',.08,False),('black',.10,False),('keys',.10,False)]:
    m=M[key];nodes=m.node_tree.nodes;links=m.node_tree.links
    tex=nodes.new('ShaderNodeTexImage');tex.image=micro_normal('Microstructure '+key,strength,woven)
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45
    links.new(tex.outputs['Color'],normal.inputs['Color'])
    links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])

def finish(obj,name,mat,parent=None):
    obj.name=name
    if mat: obj.data.materials.append(M[mat] if isinstance(mat,str) else mat)
    if parent: obj.parent=parent
    return obj

def empty(name, loc=(0,0,0), rotation=(0,0,0)):
    o=bpy.data.objects.new(name,None); scene.collection.objects.link(o)
    o.location=loc; o.rotation_euler=rotation; return o

def box(name,loc,dim,mat,bevel=.003,parent=None,segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o=bpy.context.object; o.location=loc; o.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('Manufactured edge radius','BEVEL'); b.width=bevel;b.segments=segments
        bpy.ops.object.modifier_apply(modifier=b.name)
        for polygon in o.data.polygons: polygon.use_smooth=True
        n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
        n.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=n.name)
    return finish(o,name,mat,parent)

def uv_scale(obj, sx, sy):
    for uv in obj.data.uv_layers.active.data:
        uv.uv.x*=sx; uv.uv.y*=sy

def sphere(name,loc,scale,mat,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc)
    o=bpy.context.object;o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,parent)

def cylinder(name,loc,radius,depth,mat,parent=None,rotation=(0,0,0),vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=rotation)
    o=bpy.context.object
    b=o.modifiers.new('Soft rim','BEVEL');b.width=min(.002,depth/5);b.segments=2
    bpy.ops.object.modifier_apply(modifier=b.name)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,parent)

def tube(name,points,radius,mat,parent=None,res=3):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=12
    curve.bevel_depth=radius;curve.bevel_resolution=res
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for b,p in zip(spline.bezier_points,points):
        b.co=p;b.handle_left_type='VECTOR' if 'transverse frame' in name else 'AUTO';b.handle_right_type=b.handle_left_type
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o)
    return finish(o,name,mat,parent)

def plane(name,loc,w,h,mat,parent=None,rot=(math.pi/2,0,0),repeat=(1,1)):
    bpy.ops.mesh.primitive_plane_add(size=1)
    o=bpy.context.object;o.location=loc;o.rotation_euler=rot;o.scale=(w,h,1)
    uv_scale(o,*repeat)
    return finish(o,name,mat,parent)

def text(name,body,loc,size,mat='legend',parent=None,rotation=(0,0,0)):
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';c.align_y='CENTER'
    c.resolution_u=2;c.extrude=0
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=rotation
    return finish(o,name,mat,parent)

# Keep display placeholders free of distracting studio-light reflections.
M['glass'].node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=0

# Desk and mat, true measured footprint.
box('Desk 150 x 80 cm',(0,0,-.018),(1.5,.8,.036),'desk',.009)
box('Desk mat',(0,-.045,.002),(1.38,.64,.004),'rubber',.016,segments=5)
# Subtle stitch line on the mat, integrated geometry not a floating outline.
for x in (-.68,.68):tube('Mat edge seam',[(x,-.35,.004),(x,.25,.004)],.00065,'fabric')

# IKEA BRYTET: 47 x 27 x 13 cm, narrower drawer plus left storage channel.
riser=empty('IKEA BRYTET metal monitor riser',(.025,.25,0))
# Front and rear continuous inverted-U rails, rounded across the width.
for y in (-.127,.127):
    pts=[(-.227,y,.008),(-.227,y,.092)]
    for i in range(1,9):
        a=math.pi-i*math.pi/16
        pts.append((-.196+.031*math.cos(a),y,.092+.031*math.sin(a)))
    pts.append((.196,y,.123))
    for i in range(1,9):
        a=math.pi/2-i*math.pi/16
        pts.append((.196+.031*math.cos(a),y,.092+.031*math.sin(a)))
    pts.append((.227,y,.008))
    tube('BRYTET rounded transverse frame',pts,.007,'edge',riser,4)
    for x in (-.227,.227):box('BRYTET foot cap',(x,y,.006),(.017,.022,.012),'rubber',.004,riser)
for x in (-.211,.211):
    tube('BRYTET drawer runner',[(x,-.115,.105),(x,.115,.105)],.003,'edge',riser)
    tube('BRYTET top side rim',[(x,-.12,.123),(x,.12,.123)],.003,'edge',riser)
plane('BRYTET mesh top',(0,0,.125),.447,.245,'mesh',riser,rot=(0,0,0),repeat=(24,13))
box('Drawer bottom',(.052,-.005,.035),(.319,.235,.003),'black',.003,riser)
plane('Drawer mesh front',(.052,-.125,.075),.319,.075,'mesh',riser,repeat=(18,4))
for x in (-.108,.212):
    plane('Drawer mesh side',(x,-.005,.075),.238,.075,'mesh',riser,rot=(math.pi/2,0,math.pi/2),repeat=(13,4))
    tube('Drawer side rim',[(x,-.12,.112),(x,.113,.112)],.002,'edge',riser)
tube('Drawer upper rolled edge',[(-.107,-.126,.111),(.052,-.126,.111),(.211,-.126,.111)],.002,'edge',riser)
# Folded shallow channel visible to the left of the drawer.
plane('BRYTET left tray floor',(-.164,0,.09),.095,.245,'mesh',riser,rot=(0,0,0),repeat=(5,13))
plane('BRYTET tray front',(-.164,-.124,.107),.095,.031,'mesh',riser,repeat=(5,2))

# Monitor groups keep screen anchors aligned with their panels.
def monitor(name,loc,w,h,rotation=(0,0,0)):
    group=empty(name,loc,rotation)
    box(name+' housing',(0,0,0),(w+.014,.025,h+.020),'black',.006,group)
    box(name+' back cover',(0,.017,0),(w*.88,.017,h*.84),'black',.015,group)
    plane(name+' screen',(0,-.013,0),w,h,'glass',group)
    box(name+' bottom bezel',(0,-.014,-h/2-.006),(w+.006,.003,.012),'black',.002,group)
    box(name+' rear mounting plate',(0,.040,-.035),(.082,.010,.082),'darkmetal',.004,group)
    for x in (-.03,.03):
        for z in (-.065,-.005):cylinder(name+' mount screw',(x,.046,z),.002,.002,'edge',group,(math.pi/2,0,0),12)
    for i in range(18):box(name+' rear ventilation',((i-8.5)*.009,.039,h*.30),(.004,.002,.015),'rubber',.001,group)
    anchor=empty(name+'Screen',(0,-.0145,0));anchor.parent=group
    anchor['width']=w;anchor['height']=h
    return group
# Halve the previous clearance using the unchanged MacBook lid geometry.
macbook_top=.006+.023+.2105*math.cos(math.radians(12))+.003*math.sin(math.radians(12))
old_clearance=(.433-(.29+.020)/2)-macbook_top
monitor_z=.433-old_clearance/2
portrait_z=monitor_z+(.29+.020)/2-(.531+.020)/2
left=monitor('Portrait',(-.413,.253,portrait_z),.299,.531,(0,0,math.radians(8)))
box('Samsung rectangular base',(-.415,.265,.012),(.26,.21,.021),'black',.013)
box('Samsung support',(-.415,.275,.028),(.039,.033,.035),'black',.006)
text('Samsung badge','SAMSUNG',(0,-.016,-.274),.005,parent=left,rotation=(math.pi/2,0,0))
main=monitor('Ultrawide',(.09,.275,monitor_z),.677,.29)
box('Lenovo original silver base',(.09,.245,.145),(.285,.20,.026),'silver',.015)
box('Lenovo base inset',(.09,.197,.159),(.242,.015,.002),'darkmetal',.003)
box('Lenovo neck',(.09,.29,(.158+monitor_z-.075)/2),(.050,.038,monitor_z-.075-.158),'darkmetal',.004)
text('Lenovo badge','Lenovo',(.113,-.056,.014),.009,parent=riser)
text('Lenovo display badge','Lenovo',(.282,-.016,-.152),.006,parent=main,rotation=(math.pi/2,0,0))
# Lightbar sits on monitor; center clamp is visibly separate.
bar=empty('Xiaomi monitor light',(.09,.275,monitor_z+.172))
cylinder('Lightbar aluminium tube',(0,0,0),.011,.45,'darkmetal',bar,(0,math.pi/2,0),32)
box('Lightbar diffuser',(0,-.005,-.009),(.421,.009,.003),'warm',.002,bar)
box('Lightbar central clamp',(0,.006,-.009),(.054,.052,.032),'black',.004,bar)
box('Lightbar back counterweight',(0,.040,-.018),(.062,.022,.027),'black',.004,bar)
cylinder('Lightbar wireless dial',(.38,.265,.018),.031,.035,'darkmetal')
cylinder('Dial cap',(.38,.265,.036),.030,.003,'black')

# MacBook Pro: accurate 14-inch silhouette and distinct screen plane.
laptop=empty('MacBook Pro 14 M1 Pro',(.015,-.028,.006))
box('MacBook lower enclosure',(0,0,.008),(.3126,.2212,.0155),'silver',.008,laptop,5)
box('Keyboard recess',(0,.018,.016),(.265,.110,.0015),'black',.005,laptop)
box('Trackpad',(0,-.067,.0165),(.130,.078,.0008),'darkmetal',.005,laptop)
box('Trackpad metal face',(0,-.067,.017),(.128,.076,.0005),'silver',.004,laptop)
# Opening recess in the front aluminium lip.
box('Front finger recess',(0,-.110,.013),(.036,.002,.005),'darkmetal',.002,laptop)
for x in (-.144,.144):
    plane('Speaker perforations',(x,.020,.0165),.017,.110,'speaker',laptop,rot=(0,0,0),repeat=(2,12))
# Keyboard rows, Turkish Q. Legends are actual geometry in source; export merges it.
rows=['1234567890*−','qwertyuıopğü','asdfghjklşi','zxcvbnmöç']
for r,labels in enumerate(rows):
    y=.047-r*.017
    offset=(-len(labels)*.018)/2+.009
    for k,label in enumerate(labels):
        x=offset+k*.018
        box('Key '+label,(x,y,.018),(.016,.014,.003),'keys',.002,laptop,2)
        text('Legend '+label,label,(x,y,.0196),.0047,parent=laptop)
# Outer typing keys: preserve the full keyboard silhouette at the close stop.
for x,y,w,label in [(.122,.047,.021,'⌫'),(-.122,.030,.021,'tab'),(-.122,.013,.021,'caps'),(.120,.013,.024,'↵'),(-.110,-.004,.044,'shift'),(.108,-.004,.044,'shift')]:
    box('Outer key '+label,(x,y,.018),(w,.014,.003),'keys',.002,laptop,2)
    text('Outer legend '+label,label,(x,y,.0196),.0035,parent=laptop)
# Function strip and Touch ID.
for k in range(13):
    x=-.114+k*.018
    box('Function key',(x,.070,.018),(.016,.010,.003),'keys',.0015,laptop,2)
    if k>0:text('Function legend','F'+str(k),(x,.070,.0196),.0032,parent=laptop)
cylinder('Touch ID',(.119,.070,.020),.005,.001,'darkmetal',laptop)
for x,w,label in [(-.116,.018,'fn'),(-.096,.018,'⌃'),(-.075,.021,'⌥'),(-.052,.022,'⌘'),(.052,.022,'⌘'),(.076,.020,'⌥')]:
    box('Modifier key',(x,-.027,.018),(w,.014,.003),'keys',.002,laptop,2)
    text('Modifier legend',label,(x,-.027,.0196),.004,parent=laptop)
box('Space bar',(0,-.027,.018),(.077,.014,.003),'keys',.002,laptop)
for x,y in [(.103,-.030),(.119,-.030),(.119,-.022),(.135,-.030)]:
    box('Arrow key',(x,y,.018),(.014,.006,.003),'keys',.001,laptop,2)
# Side ports, short attached cable paths.
for x in (-.157,.157):
    for y in (.038,.068):box('USB-C port',(x,y,.008),(.001,.010,.003),'black',.001,laptop)
cylinder('Screen hinge',(0,.099,.022),.007,.269,'darkmetal',laptop,(0,math.pi/2,0))
angle=math.radians(-12)
lid=empty('MacBook lid',(0,.099+.105*math.sin(-angle),.023+.105*math.cos(angle)),(angle,0,0));lid.parent=laptop
box('Display aluminium shell',(0,0,0),(.3126,.006,.211),'silver',.008,lid,5)
box('Display black border',(0,-.0035,0),(.304,.0015,.201),'black',.006,lid)
plane('MacBook screen',(0,-.0045,.001),.298,.194,'glass',lid)
box('MacBook notch',(0,-.005,.094),(.032,.001,.008),'black',.002,lid)
anchor=empty('MacBookScreen',(0,-.0055,.001));anchor.parent=lid;anchor['width']=.298;anchor['height']=.194
# Wrist cushion sits immediately in front of the MacBook, as photographed.
rest=box('Keyboard wrist cushion',(.015,-.185,.016),(.365,.080,.025),'fabric',.012,segments=7)
uv_scale(rest,12,3)
tube('Keyboard cushion seam',[(-.149,-.219,.018),(.015,-.222,.018),(.179,-.219,.018),(.194,-.185,.018),(.179,-.151,.018),(.015,-.148,.018),(-.149,-.151,.018),(-.164,-.185,.018),(-.149,-.219,.018)],.0003,'rubber')

# MX Master 3S: asymmetric sculpted body, extended thumb shelf and both wheels.
mouse=empty('Logitech MX Master 3S',(.39,-.075,.004),(0,0,math.radians(-9)))
# Manufacturer envelope: 124.9 x 84.3 x 51 mm, shaped longitudinal sections.
sections=[(-.062,.001,.006,-.001),(-.055,.025,.030,-.004),(-.040,.032,.044,-.006),(-.022,.033,.050,-.007),(0,.031,.048,-.006),(.021,.029,.041,-.003),(.043,.027,.031,0),(.057,.023,.024,0),(.062,.002,.009,0)]
def section_at(y):
    for i in range(len(sections)-1):
        if sections[i][0]<=y<=sections[i+1][0]:
            a,b=sections[i],sections[i+1];t=(y-a[0])/(b[0]-a[0]);t=t*t*(3-2*t)
            return [a[k]+(b[k]-a[k])*t for k in range(1,4)]
    return list(sections[0][1:])
verts=[];faces=[];rings=41;sides=28
for j in range(rings):
    y=-.062+j*.124/(rings-1);w,h,c=section_at(y)
    for i in range(sides+1):
        angle=math.pi*i/sides
        verts.append((c+w*math.cos(angle),y,.005+(h-.005)*math.sin(angle)**.60))
for j in range(rings-1):
    for i in range(sides):
        a=j*(sides+1)+i;faces.append((a,a+1,a+sides+2,a+sides+1))
faces.extend([tuple(range(sides,-1,-1)),tuple((rings-1)*(sides+1)+i for i in range(sides+1))])
me=bpy.data.meshes.new('MX Master sculpted surface');me.from_pydata(verts,[],faces);me.update()
ob=bpy.data.objects.new('MX Master upper shell and buttons',me);scene.collection.objects.link(ob);finish(ob,ob.name,'rubber',mouse)
me.materials.append(M['black'])
sub=ob.modifiers.new('Continuous moulded surface','SUBSURF');sub.levels=1;sub.render_levels=1
for poly in me.polygons:
    poly.use_smooth=True
    cy=sum(me.vertices[i].co.y for i in poly.vertices)/len(poly.vertices)
    if cy>.005:poly.material_index=1
# A flared, thin thumb platform, integrated with the bottom chassis.
outline=[(-.040,-.050),(-.055,-.030),(-.052,.014),(-.034,.046),(-.010,.060),(.019,.054),(.029,.035),(.031,-.024),(.021,-.052),(0,-.061)]
vs=[(x,y,z) for z in (.002,.007) for x,y in outline];n=len(outline)
fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
me=bpy.data.meshes.new('MX base with thumb flare');me.from_pydata(vs,[],fs);me.update()
ob=bpy.data.objects.new('MX integrated thumb platform',me);scene.collection.objects.link(ob);finish(ob,ob.name,'rubber',mouse)
bpy.context.view_layer.objects.active=ob;ob.select_set(True)
bev=ob.modifiers.new('Rounded platform','BEVEL');bev.width=.004;bev.segments=4;bpy.ops.object.modifier_apply(modifier=bev.name)
# Creases follow the actual upper curvature, wheels sit in recessed sockets.
tube('MX separated click buttons',[(-.004,.004,.047),(-.002,.022,.041),(0,.043,.031),(0,.060,.020)],.0005,'black',mouse)
for x in (-.008,.006):box('MagSpeed socket edge',(x,.031,.035),(.003,.026,.003),'rubber',.001,mouse)
cylinder('MX MagSpeed wheel',(-.001,.032,.035),.007,.009,'silver',mouse,(0,math.pi/2,0),48)
for x in [-.0045,-.003,-.0015,0,.0015,.003]:
    cylinder('MagSpeed fine knurl',(-.001+x,.032,.035),.0071,.0004,'darkmetal',mouse,(0,math.pi/2,0),32)
for side in (-1,1):
    pts=[]
    for j in range(13):
        y=.008+j*.047/12;w,h,c=section_at(y);x=c+side*w*.60
        pts.append((x,y,.005+(h-.005)*(1-.60**2)**.30+.0002))
    tube('MX outer button parting seam',pts,.00035,'darkmetal',mouse)
box('MX mode button',(-.003,.006,.047),(.006,.010,.002),'darkmetal',.0025,mouse)
cylinder('MX thumb wheel',(-.030,.017,.026),.004,.019,'silver',mouse,(math.pi/2,0,0),32)
for y in [.009,.012,.015,.018,.021,.024]:cylinder('Thumb wheel knurl',(-.030,y,.026),.0042,.0005,'darkmetal',mouse,(math.pi/2,0,0),20)
for y in (-.007,-.019):box('MX side thumb button',(-.034,y,.026),(.004,.009,.004),'black',.0015,mouse)
text('Mouse logi mark','logi',(-.012,-.029,.051),.007,'legend',mouse)
box('MX USB-C socket',(0,.061,.012),(.010,.001,.004),'black',.0015,mouse)
# Mouse wrist rest, kidney-shaped via two overlapping soft volumes.
wr=empty('Mouse wrist rest',(.395,-.255,.005),(0,0,math.radians(-6)))
cushion=sphere('Mouse rest cushion',(0,0,.014),(.062,.031,.015),'fabric',wr)
# A single continuous kidney cushion, not intersecting lobes.
for vertex in cushion.data.vertices:
    vertex.co.y += .13 * vertex.co.x * vertex.co.x

# Headphones and stand, paired oval earcups plus shaped headband.
head=empty('Razer Barracuda and stand',(.48,.255,0),(0,0,math.radians(-8)))
box('Headphone stand base',(0,0,.004),(.126,.115,.008),'black',.014,head)
box('Headphone stand stem',(0,.025,.127),(.014,.021,.24),'edge',.004,head)
box('Headphone saddle',(0,.01,.245),(.070,.036,.010),'rubber',.008,head)
# Broad headband ribbon along elliptical arc.
def band(name,rx,rz,centerz,width,thickness,mat):
    vs=[];fs=[];steps=32
    for i in range(steps+1):
        a=math.radians(12+156*i/steps)
        for radial,y in [(0,-width/2),(0,width/2),(thickness,-width/2),(thickness,width/2)]:
            vs.append(((rx+radial)*math.cos(a),y,centerz+(rz+radial)*math.sin(a)))
    for i in range(steps):
        k=i*4;n=k+4
        fs.extend([(k,n,n+1,k+1),(k+2,k+3,n+3,n+2),(k,k+2,n+2,n),(k+1,n+1,n+3,k+3)])
    fs.extend([(0,1,3,2),(steps*4,steps*4+2,steps*4+3,steps*4+1)])
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update()
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);finish(ob,name,mat,head)
    for p in me.polygons:p.use_smooth=True
band('Barracuda outer headband',.070,.112,.138,.027,.0035,'black')
band('Barracuda headband padding',.066,.105,.140,.025,.0035,'fabric')
for x in (-.0365,.0365):
    cup=empty('Barracuda earcup',(x,-.008,.077),(0,math.radians(-25 if x<0 else 25),math.radians(12 if x<0 else -12)));cup.parent=head
    box('Barracuda outer ear housing',(0,.004,0),(.061,.025,.094),'black',.025,cup,6)
    box('Barracuda outer inset',(0,.017,0),(.049,.003,.075),'rubber',.022,cup,5)
    # Continuous elliptical torus with a visibly recessed opening.
    vs=[];fs=[];major=40;minor=10
    for i in range(major):
        a=2*math.pi*i/major
        for j in range(minor):
            b=2*math.pi*j/minor
            vs.append(((.024+.0065*math.cos(b))*math.cos(a),-.016+.007*math.sin(b),(.037+.007*math.cos(b))*math.sin(a)))
    for i in range(major):
        for j in range(minor):
            fs.append((i*minor+j,((i+1)%major)*minor+j,((i+1)%major)*minor+(j+1)%minor,i*minor+(j+1)%minor))
    me=bpy.data.meshes.new('Oval cushion with opening');me.from_pydata(vs,[],fs);me.update()
    ob=bpy.data.objects.new('Barracuda fabric cushion',me);scene.collection.objects.link(ob);finish(ob,ob.name,'fabric',cup)
    for poly in me.polygons:poly.use_smooth=True
    sphere('Dark recessed speaker cloth',(0,-.012,0),(.018,.003,.031),'rubber',cup)
    # Recessed moulded sliders join the band to the shell without exposed forks.
    box('Barracuda recessed adjustment slider',(0,.004,.062),(.022,.012,.050),'black',.004,cup,5)
    box('Barracuda slider inset',(0,-.003,.065),(.014,.001,.032),'rubber',.002,cup)
    cylinder('Barracuda swivel pivot',(0,.012,.046),.007,.002,'darkmetal',cup,(math.pi/2,0,0),24)
    for z in (-.026,-.014):box('Headphone controls',(0,.025,z),(.010,.002,.005),'darkmetal',.002,cup)
for side in (-1,1):
    tube('Barracuda curved adjustment arm',[(side*.068,0,.161),(side*.070,0,.157),(side*.072,0,.153)],.005,'black',head,4)
text('Headband Razer emboss','RAZER',(0,-.018,.251),.012,'darkmetal',head)

# Close-view manufacturing details. Device positions and screen anchors stay fixed.
for x in (-.143,.143):
    for y in (-.089,.086):
        cylinder('MacBook lower case screw',(x,y,.001),.0014,.0005,'darkmetal',laptop,vertices=12)
# Actual asymmetric M1 Pro port arrangement: left MagSafe/USB-C/audio, right HDMI/USB-C/SD.
for obj in list(scene.objects):
    if obj.name.startswith('USB-C port'): bpy.data.objects.remove(obj,do_unlink=True)
for x,y,length,height in [(-.157,.068,.011,.003),(-.157,.042,.011,.003),(-.157,.090,.015,.0035),(.157,.067,.014,.0045),(.157,.039,.011,.003),(.157,.006,.023,.002)]:
    box('MacBook recessed port liner',(x,y,.008),(.001,length,height),'black',.0006,laptop,2)
    box('MacBook port inner contact',(x*1.001,y,.008),(.0002,length*.62,.0006),'darkmetal',.0001,laptop,1)
cylinder('MacBook audio jack',(-.157,.014,.008),.0017,.001,'black',laptop,(0,math.pi/2,0),16)
for x in (-.116,.116):
    cylinder('MacBook hinge collar',(x,.099,.022),.0074,.012,'black',laptop,(0,math.pi/2,0),20)
cylinder('MacBook camera lens',(0,-.0057,.094),.0016,.0005,'glass',lid,(math.pi/2,0,0),16)
for x in (-.012,.012):cylinder('Camera sensor',(x,-.0057,.094),.0008,.0005,'black',lid,(math.pi/2,0,0),12)
# Moulded monitor edge seams and the Lenovo's underside controls.
for group,w,h in [(left,.299,.531),(main,.677,.29)]:
    for x in (-w/2-.004,w/2+.004):
        tube('Monitor housing parting line',[(x,.003,-h/2),(x,.003,h/2)],.00045,'darkmetal',group,1)
for x in (.23,.252,.274,.296):
    cylinder('Lenovo underside control',(x,-.003,-.158),.0025,.0015,'darkmetal',main,vertices=12)
cylinder('Lenovo blue power LED',(.321,-.016,-.152),.0012,.0007,'white',main,(math.pi/2,0,0),12)
for x in (-.220,.220):
    cylinder('Xiaomi end cap',(x,0,0),.0112,.002,'black',bar,(0,math.pi/2,0),24)
# Drawer grip and fasteners: subtle hardware on the existing riser geometry.
box('BRYTET drawer recessed grip',(.052,-.128,.092),(.052,.004,.012),'edge',.004,riser)
for x in (-.211,.211):
    for y in (-.09,.09):
        cylinder('BRYTET rail rivet',(x,y,.126),.0023,.001,'darkmetal',riser,vertices=12)
# Fine pad seams follow the near-touching ear cushions without changing their fit.
for obj in list(scene.objects):
    if obj.name.startswith('Barracuda earcup'):
        points=[(.0305*math.cos(a),-.016,.044*math.sin(a)) for a in np.linspace(0,2*math.pi,49)]
        tube('Barracuda cushion perimeter seam',points,.00025,'rubber',obj,1)
# Complete the fabric mat edge and wrist-rest identity visible on approach.
for y in (-.35,.26): tube('Mat stitched horizontal edge',[(-.675,y,.0045),(.675,y,.0045)],.0005,'fabric',res=1)
text('Wrist cushion emboss','GLORIOUS',(.015,-.185,.029),.005,'darkmetal')

# Lighting objects and small accessories from the clean reference.
lamp=empty('Rounded desk lamp',(.673,.255,0))
box('Opal lamp body',(0,0,.10),(.14,.137,.20),'pink',.052,lamp,16)
box('Lamp front touch strip',(0,-.069,.066),(.017,.002,.074),'silver',.006,lamp)
box('Lamp touch indicator',(0,-.071,.067),(.0015,.001,.043),'white',.0005,lamp)
strip=empty('Left vertical light',(-.739,.389,0))
box('Vertical light housing',(0,0,.307),(.022,.022,.61),'black',.004,strip)
box('Vertical warm diffuser',(0,-.010,.307),(.014,.003,.595),'warm',.002,strip)
text('Lamp power icon','⏻',(0,-.071,.038),.006,'white',lamp,(math.pi/2,0,0))
text('Lamp mode icon','○',(0,-.071,.095),.006,'white',lamp,(math.pi/2,0,0))
# Tablet lies flat at the left, with a pale pencil along its edge.
tablet=empty('Tablet on desk',(-.435,-.17,.006),(0,0,0))
box('Tablet casing',(0,0,.004),(.176,.238,.008),'silver',.010,tablet)
box('Tablet black bezel',(0,0,.009),(.172,.233,.002),'black',.009,tablet)
plane('Tablet glass',(0,0,.0102),.160,.217,'glass',tablet,rot=(0,0,0))
cylinder('Tablet pencil',(.097,0,.006),.004,.171,'desk',tablet,(math.pi/2,0,0))
# A few intentional visible cable routes; no random desktop clutter.
tube('MacBook power cable',[(-.142,.012,.016),(-.205,.012,.017),(-.222,.08,.014),(-.235,.19,.018)],.002,'desk')
tube('MacBook display cable',[(.172,.01,.015),(.22,.01,.014),(.30,.04,.012),(.315,.15,.018),(.22,.32,.14)],.003,'black')

# Backdrop belongs to presentation, not an invented recreation of the whole room.
plane('Backdrop wall',(0,.46,.45),4.2,4.0,'wall')

# Screen names and camera contract are in Three.js Y-up coordinates.
def to_web(v):return [round(v[0],6),round(v[2],6),round(-v[1],6)]
bpy.context.view_layer.update()
screens={}
for name in ['PortraitScreen','UltrawideScreen','MacBookScreen']:
    ob=bpy.data.objects[name]
    pos=ob.matrix_world.translation
    normal=ob.matrix_world.to_quaternion() @ Vector((0,-1,0))
    up=ob.matrix_world.to_quaternion() @ Vector((0,0,1))
    screens[name]={'position':to_web(pos),'normal':to_web(normal),'up':to_web(up),'width':ob['width'],'height':ob['height']}
# Camera distance is adjusted for viewport aspect in the viewer, these are desktop presets.
cameras=[{'id':'wide','position':[.08, .74, 1.70],'target':[0,.27,-.025],'fov':43}]
for sid,camid,distance in [('PortraitScreen','portrait',.79),('UltrawideScreen','ultrawide',.90),('MacBookScreen','macbook',.47)]:
    s=screens[sid];t=s['position'];n=s['normal']
    cameras.append({'id':camid,'position':[round(t[i]+n[i]*distance,6) for i in range(3)],'target':t,'fov':43})
contract={'units':'metres','up':'Y','desk':{'width':1.5,'depth':.8},'screens':screens,'cameras':cameras}
(ROOT/'src/lib/desk-scene.json').write_text(json.dumps(contract,indent=2)+'\n')

# Lighting kept in source and recreated explicitly in the viewer.
def area(name,location,target,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=location
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large soft key',(-.65,-.60,1.45),(0,.05,.2),22,(1,.85,.68),1.4)
area('Cool front fill',(.9,-.7,.7),(0,.1,.25),10,(.68,.80,1),1.0)
area('Left wall wash',(-.60,.32,.35),(-.6,.46,.35),7,(1,.57,.25),.4)
area('Lamp wall wash',(.67,.29,.14),(.67,.46,.22),4,(1,.43,.51),.25)
area('Lightbar desk pool',(.09,.21,.60),(0,-.1,0),5,(1,.84,.61),.4)
area('Hidden amber bias light',(.08,.37,.41),(.08,.46,.46),7,(1,.53,.23),.68)
area('Hidden lower desk glow',(.04,.40,.08),(.04,.46,.18),3,(1,.60,.30),.75)
scene.world.color=(.035,.035,.035)
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
# Store a usable opening camera in .blend.
data=bpy.data.cameras.new('Review camera');camera=bpy.data.objects.new('Review camera',data);scene.collection.objects.link(camera);scene.camera=camera

def set_camera(preset):
    def from_web(v):return Vector((v[0],-v[2],v[1]))
    camera.location=from_web(preset['position']);target=from_web(preset['target'])
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    data.type='PERSP';data.sensor_fit='VERTICAL';data.sensor_height=24;data.lens=24/(2*math.tan(math.radians(preset['fov'])/2))
set_camera(cameras[0])
# Blend remains fully editable, with individual named components and packed textures.
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'onur-desk.blend'),compress=True)

if '--render' in sys.argv:
    detail_cameras=[
        {'id':'mouse-detail','position':[.255,.18,.28],'target':[.385,.028,.075],'fov':43},
        {'id':'headphones-detail','position':[.34,.31,.15],'target':[.48,.14,-.25],'fov':43},
        {'id':'riser-detail','position':[.32,.27,.35],'target':[.025,.10,-.24],'fov':43},
        {'id':'front','position':[0,.42,1.7],'target':[0,.30,-.20],'fov':43},
        {'id':'side','position':[1.65,.65,.55],'target':[0,.28,-.10],'fov':43},
        {'id':'lamps-detail','position':[.95,.35,.20],'target':[.64,.13,-.25],'fov':43},
    ]
    render_filter=next((a.split('=',1)[1].split(',') for a in sys.argv if a.startswith('--views=')),None)
    for preset in sorted(cameras+detail_cameras, key=lambda p: p['id'] != 'headphones-detail'):
        if render_filter and preset['id'] not in render_filter:continue
        set_camera(preset)
        scene.render.filepath=str(POSTERS/(preset['id']+'.png'))
        bpy.ops.render.render(write_still=True)

# Bake static diffuse lighting on receivers. This preserves Cycles contact
# shadows/indirect wall glow in the web model without a real-time GI dependency.
for object_name in ['Desk 150 x 80 cm','Desk mat','Backdrop wall']:
    receiver=bpy.data.objects[object_name]
    image=bpy.data.images.new('Baked '+object_name,width=1024,height=1024,alpha=False)
    original=receiver.data.materials[0]
    working=original.copy();receiver.data.materials[0]=working
    tex=working.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    working.node_tree.nodes.active=tex
    bpy.ops.object.select_all(action='DESELECT');receiver.select_set(True);bpy.context.view_layer.objects.active=receiver
    scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=True;scene.render.bake.margin=8
    bpy.ops.object.bake(type='DIFFUSE')
    # Filter Monte Carlo noise at texel scale; preserve broad baked shadows.
    pixels=np.empty(1024*1024*4,dtype=np.float32);image.pixels.foreach_get(pixels)
    pixels=pixels.reshape((1024,1024,4))
    radius=4 if object_name=='Backdrop wall' else 2
    sigma=2.0 if object_name=='Backdrop wall' else .85
    kernel=np.exp(-np.arange(-radius,radius+1,dtype=np.float32)**2/(2*sigma*sigma));kernel/=kernel.sum()
    for axis in (0,1):
        padding=[(0,0),(0,0),(0,0)];padding[axis]=(radius,radius)
        padded=np.pad(pixels,padding,mode='edge');filtered=np.zeros_like(pixels)
        for offset,weight in enumerate(kernel):
            slices=[slice(None)]*3;slices[axis]=slice(offset,offset+1024)
            filtered+=padded[tuple(slices)]*weight
        pixels=filtered
    image.pixels.foreach_set(pixels.ravel());image.update();image.pack()
    baked=material('Baked '+object_name,(1,1,1),1,texture=image)
    receiver.data.materials[0]=baked

# Flatten transforms and batch by material for the delivery model. Source remains intact.
for obj in list(scene.objects):
    if obj.type in {'CURVE','FONT'}:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
    if obj.type=='MESH':
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers): bpy.ops.object.modifier_apply(modifier=modifier.name)
        world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
# Preserve screen anchors as empty, world-space transforms.
for obj in list(scene.objects):
    if obj.type=='EMPTY':
        world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
batches={}
for obj in list(scene.objects):
    if obj.type=='MESH':
        key=obj.data.materials[0].name if obj.data.materials else 'None'
        batches.setdefault(key,[]).append(obj)
for material_name,objects in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();bpy.context.object.name='Batch '+material_name
# Export only meshes and named integration anchors, excluding the Blender lights/camera.
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='MESH' or obj.name in screens:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'onur-desk.glb'),export_format='GLB',use_selection=True,
    export_image_format='JPEG',export_image_quality=85,
    export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,export_extras=True,export_yup=True)
triangles=sum(len(p.vertices)-2 for o in scene.objects if o.type=='MESH' for p in o.data.polygons)
report={'blender':bpy.app.version_string,'triangles':triangles,'materialBatches':len(batches),
        'glbBytes':(PUBLIC/'onur-desk.glb').stat().st_size,'textureMaxDimension':1024,
        'layout':{'oldClearanceM':old_clearance,'clearanceM':old_clearance/2,'monitorCenterX':.09,'supportCenterX':.09,'riserCenterX':.025,'monitorTopM':monitor_z+.155,'portraitTopM':portrait_z+.2755,'leftLightOuterX':-.75,'leftLightOuterY':.4},
        'notes':['Photo-derived device housings are approximate.','Material batches reduce draw calls; measure final renderer counters.','No source photo pixels are included.']}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('DESK_REPORT',json.dumps(report))
