import { readFileSync } from 'node:fs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
globalThis.self = globalThis
if (!globalThis.createImageBitmap) globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close(){} })
if (!globalThis.Image) globalThis.Image = class { set src(_v){} get width(){return 1} get height(){return 1} }
if (!globalThis.ImageData) globalThis.ImageData = class { constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4)} }
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w,h){this.width=w;this.height=h} getContext(){return null} }

const data = readFileSync('sony_alpha_3.glb')
const loader = new GLTFLoader()
loader.parse(data.buffer, '', (gltf) => {
  const scene = gltf.scene
  scene.updateWorldMatrix(true)
  const box = new THREE.Box3().setFromObject(scene)
  const minZ = box.min.z
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3()

  const rearTris = [] // {zMax, zMin, cx, cy}
  scene.traverse((obj) => {
    if (!obj.isMesh) return
    const pos = obj.geometry.attributes.position
    const index = obj.geometry.index
    const m = obj.matrixWorld
    const triCount = index ? index.count/3 : pos.count/3
    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t*3) : t*3
      const i1 = index ? index.getX(t*3+1) : t*3+1
      const i2 = index ? index.getX(t*3+2) : t*3+2
      a.fromBufferAttribute(pos, i0).applyMatrix4(m)
      b.fromBufferAttribute(pos, i1).applyMatrix4(m)
      c.fromBufferAttribute(pos, i2).applyMatrix4(m)
      e1.subVectors(b, a); e2.subVectors(c, a)
      n.crossVectors(e1, e2)
      const len = n.length(); if (len < 1e-9) continue
      n.divideScalar(len)
      rearTris.push({ nZ: n.z, zMax: Math.max(a.z,b.z,c.z), zMin: Math.min(a.z,b.z,c.z), cx:(a.x+b.x+c.x)/3, cy:(a.y+b.y+c.y)/3 })
    }
  })

  const bb = (list, label) => {
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity
    // need verts; approximate with centroid is wrong. recompute by filtering again below.
  }

  // A) Visual silhouette center (rear = what you see when camera yaws 180)
  const rear = rearTris.filter(t => t.nZ < -0.5)
  const front = rearTris.filter(t => t.nZ > 0.5)
  const bounds = (list) => {
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      const pos = obj.geometry.attributes.position; const index = obj.geometry.index; const m = obj.matrixWorld
      const triCount = index ? index.count/3 : pos.count/3
      for (let t=0;t<triCount;t++){
        const i0=index?index.getX(t*3):t*3, i1=index?index.getX(t*3+1):t*3+1, i2=index?index.getX(t*3+2):t*3+2
        a.fromBufferAttribute(pos,i0).applyMatrix4(m); b.fromBufferAttribute(pos,i1).applyMatrix4(m); c.fromBufferAttribute(pos,i2).applyMatrix4(m)
        e1.subVectors(b,a); e2.subVectors(c,a); n.crossVectors(e1,e2); const l=n.length(); if(l<1e-9)continue; n.divideScalar(l)
        let keep = false
        if (list === 'rear') keep = n.z < -0.5
        else if (list === 'front') keep = n.z > 0.5
        else keep = true
        if (!keep) continue
        for (const v of [a,b,c]) { minX=Math.min(minX,v.x); maxX=Math.max(maxX,v.x); minY=Math.min(minY,v.y); maxY=Math.max(maxY,v.y); minZ=Math.min(minZ,v.z); maxZ=Math.max(maxZ,v.z) }
      }
    })
    return { minX, maxX, minY, maxY, minZ, maxZ, cx:(minX+maxX)/2, cy:(minY+maxY)/2, cz:(minZ+maxZ)/2, w:maxX-minX, h:maxY-minY, d:maxZ-minZ }
  }
  const fmt = (o) => `x ${o.minX.toFixed(2)}..${o.maxX.toFixed(2)} (w ${o.w.toFixed(2)}, c ${o.cx.toFixed(2)}) | y ${o.minY.toFixed(2)}..${o.maxY.toFixed(2)} (h ${o.h.toFixed(2)}, c ${o.cy.toFixed(2)}) | z ${o.minZ.toFixed(2)}..${o.maxZ.toFixed(2)}`
  console.log('REAR visual bounds :', fmt(bounds('rear')))
  console.log('FRONT visual bounds:', fmt(bounds('front')))
  console.log('ALL bounds         :', fmt(bounds('all')))

  // B) Screen rectangle: bucket rear-facing tris by zMax, list rectangular clusters
  const bucket = new Map()
  for (const t of rear) {
    const k = Math.round(t.zMax*50)/50
    if (!bucket.has(k)) bucket.set(k, [])
    bucket.get(k).push(t)
  }
  console.log('\nzMax buckets (rear-facing) with bbox:')
  const rows = [...bucket.entries()].sort((x,y)=>x[0]-y[0])
  for (const [k, list] of rows) {
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      const pos=obj.geometry.attributes.position; const index=obj.geometry.index; const m=obj.matrixWorld
      const triCount=index?index.count/3:pos.count/3
      for (let t=0;t<triCount;t++){
        const i0=index?index.getX(t*3):t*3, i1=index?index.getX(t*3+1):t*3+1, i2=index?index.getX(t*3+2):t*3+2
        a.fromBufferAttribute(pos,i0).applyMatrix4(m); b.fromBufferAttribute(pos,i1).applyMatrix4(m); c.fromBufferAttribute(pos,i2).applyMatrix4(m)
        e1.subVectors(b,a); e2.subVectors(c,a); n.crossVectors(e1,e2); const l=n.length(); if(l<1e-9)continue; n.divideScalar(l)
        if (n.z >= -0.5) continue
        const zM = Math.max(a.z,b.z,c.z)
        if (Math.abs(zM - k) > 0.02) continue
        for (const v of [a,b,c]){ minX=Math.min(minX,v.x); maxX=Math.max(maxX,v.x); minY=Math.min(minY,v.y); maxY=Math.max(maxY,v.y) }
      }
    })
    const w=maxX-minX, h=maxY-minY
    if (list.length > 3) console.log(`  z≈${k.toFixed(2)}  n=${String(list.length).padStart(4)}  x ${minX.toFixed(2)}..${maxX.toFixed(2)} (w ${w.toFixed(2)})  y ${minY.toFixed(2)}..${maxY.toFixed(2)} (h ${h.toFixed(2)})  aspect ${(w/h).toFixed(2)}  center ${((minX+maxX)/2).toFixed(2)},${((minY+maxY)/2).toFixed(2)}`)
  }
}, (e) => console.error('parse error', e))
